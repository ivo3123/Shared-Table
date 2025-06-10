<?php
$host = '127.0.0.1'; 
$port = 8080;        

$socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
socket_set_option($socket, SOL_SOCKET, SO_REUSEADDR, 1);
socket_bind($socket, $host, $port);
socket_listen($socket);

$clients = []; // Масив за съхранение на сокетите
$users = [];   // Масив за съхранение на потребителските имена, асоциирани със сокетите (key = socket_resource_id => value = username)

echo "WebSocket server started on $host:$port\n";

while (true) {
    $changedSockets = $clients;
    $changedSockets[] = $socket; // Добавяме главния слушащ сокет

    $write = []; // Не се ползват за този пример
    $except = []; // Не се ползват за този пример

    // Изчакваме за активност на сокетите
    // Последните два параметъра са таймаут: 0 секунди, 10 микросекунди
    // Това прави цикъла почти незабавен, но не натоварва процесора на 100%
    socket_select($changedSockets, $write, $except, 0, 10);

    // Проверяваме дали главният слушащ сокет има активност (нова връзка)
    if (in_array($socket, $changedSockets)) {
        $newSocket = socket_accept($socket); // Приемаме новата връзка
        $clients[] = $newSocket; // Добавяме новия клиентски сокет към масива
        echo "New client connected\n";
        
        // Премахваме главния сокет от $changedSockets, за да не го обработваме като клиент по-долу
        $socketKey = array_search($socket, $changedSockets);
        unset($changedSockets[$socketKey]);    
    }

    // Обхождаме всички сокети, които имат активност (данни за четене или са прекъснали връзка)
    foreach ($changedSockets as $clientSocket) {
        // Опитваме се да прочетем данни от клиентския сокет
        // @ - потиска грешки, ако клиентът е прекъснал връзка неочаквано
        $data = @socket_recv($clientSocket, $buffer, 1024, 0);

        // Проверяваме дали четенето е неуспешно (false) или е прочетено 0 байта (клиентът се е откачил)
        if ($data === false || $data == 0) { 
            $disconnectedUsername = 'Unknown';
            $clientSocketId = (int)$clientSocket; // Вземаме ID на сокета

            // Намираме ключа на клиента в масива $clients
            $clientKeyInClients = array_search($clientSocket, $clients);
            
            if ($clientKeyInClients !== false) {
                // Ако сокетът е имал асоциирано потребителско име, го взимаме и премахваме
                if (isset($users[$clientSocketId])) {
                    $disconnectedUsername = $users[$clientSocketId];
                    unset($users[$clientSocketId]); // Премахваме потребителя от списъка с активни потребители
                }
                unset($clients[$clientKeyInClients]); // Премахваме сокета от масива $clients
                socket_close($clientSocket); // Затваряме сокета
                echo "Client '{$disconnectedUsername}' disconnected\n";
                // Изпращаме актуализиран списък с потребители на всички останали
                sendUserListToAllClients($clients, array_values($users));
            }
            continue; // Преминаваме към следващия клиент в цикъла
        }

        // Проверяваме дали текущите данни са HTTP хедъри за handshake
        $isHandshakeRequest = strpos($buffer, 'Sec-WebSocket-Key:') !== false;

        if ($isHandshakeRequest) {
            // Извършваме WebSocket ръкостискане
            performHandshake($clientSocket, $buffer);
        } else {
            // Връзката е вече WebSocket, демаскираме полученото съобщение
            $message = unmask($buffer);
            
            if (!empty($message)) {
                $clientSocketId = (int)$clientSocket;

                // Ако това е първото съобщение от клиента след handshake-а, то е потребителското име
                if (!isset($users[$clientSocketId])) {
                    $users[$clientSocketId] = $message; // Асоциираме сокета с потребителското име
                    echo "User '{$message}' connected via WebSocket.\n";
                    // Изпращаме актуализиран списък с потребители на всички
                    sendUserListToAllClients($clients, array_values($users));
                } else {
                    // Това е обикновено чат съобщение
                    $senderUsername = $users[$clientSocketId];
                    echo "Received from '{$senderUsername}': $message\n";
                    
                    // Broadcast-ваме съобщението към всички останали клиенти
                    // Форматираме съобщението като JSON за по-лесно парсване от клиента
                    $chatMessageForClients = json_encode([
                        'type' => 'chat_message',
                        'sender' => $senderUsername,
                        'message' => $message
                    ]);

                    foreach ($clients as $client) {
                        // Изпращаме само ако клиентът не е изпращачът и е валиден
                        if ($client != $clientSocket) {
                            sendMessage($client, $chatMessageForClients);
                        }
                    }
                }
            }
        }
    }
}


/**
 * Извършва WebSocket ръкостискане (handshake) с новия клиент.
 * @param resource $clientSocket Сокетът на новия клиент.
 * @param string $headers Получените HTTP хедъри от клиента.
 */
function performHandshake($clientSocket, $headers) {
    $parsedHeaders = parseHeaders($headers);
    $secKey = $parsedHeaders['Sec-WebSocket-Key'];
    $secAccept = base64_encode(pack('H*', sha1($secKey . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')));
    $handshakeResponse = "HTTP/1.1 101 Switching Protocols\r\n" .
        "Upgrade: websocket\r\n" .
        "Connection: Upgrade\r\n" .
        "Sec-WebSocket-Accept: $secAccept\r\n\r\n";
    socket_write($clientSocket, $handshakeResponse, strlen($handshakeResponse));
}

/**
 * Парсва HTTP хедъри от текстов низ в асоциативен масив.
 * @param string $headers Текстов низ с HTTP хедъри.
 * @return array Асоциативен масив с хедъри.
 */
function parseHeaders($headers) {
    $headersArray = explode("\r\n", $headers);
    $parsedHeaderArray = [];
    foreach ($headersArray as $header) {
        $parts = explode(": ", $header);
        if (count($parts) === 2) {
            $parsedHeaderArray[$parts[0]] = $parts[1];
        }
    }
    return $parsedHeaderArray;
}

/**
 * Демаскира (декодира) payload на WebSocket рамка.
 * Клиентите маскират данните, които изпращат до сървъра.
 * @param string $payload Бинарните данни на WebSocket рамката.
 * @return string Демаскираното текстово съобщение.
 */
function unmask($payload)
{
    $length = ord($payload[1]) & 127; // Взема дължината на payload-а
    
    // Определяне на позицията на маскиращите ключове и данните
    if ($length == 126) { // Ако дължината е 126, следващите 2 байта са реалната дължина
        $masks = substr($payload, 4, 4);
        $data = substr($payload, 8);
    } elseif ($length == 127) { // Ако дължината е 127, следващите 8 байта са реалната дължина
        $masks = substr($payload, 10, 4);
        $data = substr($payload, 14);
    } else { // Ако дължината е <= 125, дължината е в първия байт
        $masks = substr($payload, 2, 4);
        $data = substr($payload, 6);
    }

    $unmaskedtext = '';
    // Прилага XOR операция с маскиращите ключове
    for ($i = 0; $i < strlen($data); ++$i) {
        $unmaskedtext .= $data[$i] ^ $masks[$i % 4];
    }
    return $unmaskedtext;
}

/**
 * Изпраща съобщение към конкретен клиент чрез WebSocket рамка.
 * @param resource $clientSocket Сокетът на клиента, към когото се изпраща съобщението.
 * @param string $message Текстовото съобщение за изпращане.
 */
function sendMessage($clientSocket, $message)
{
    $message = mask($message); // Маскираме съобщението (сървърът не маскира към клиент в стандартен протокол, но тук го правим за простота)
    socket_write($clientSocket, $message, strlen($message));
}

/**
 * Маскира (кодира) текстово съобщение във формат на WebSocket рамка.
 * Сървърите обикновено не маскират изходящи данни, но тази функция е за симетрия с unmask.
 * @param string $message Текстовото съобщение.
 * @return string Бинарна WebSocket рамка.
 */
function mask($message)
{
    $frame = [];
    $frame[0] = 129; // FIN bit + Text frame (opcode 0x1)

    $length = strlen($message);
    if ($length <= 125) {
        $frame[1] = $length;
    } elseif ($length <= 65535) { // 2 байта за дължина (16-bit unsigned integer)
        $frame[1] = 126;
        $frame[2] = ($length >> 8) & 255;
        $frame[3] = $length & 255;
    } else { // 8 байта за дължина (64-bit unsigned integer)
        $frame[1] = 127;
        // За голяма дължина се ползват 8 байта, но PHP int може да е 32-bit
        // Това е по-сложно за чист PHP socket имплементация и може да не работи за много големи съобщения.
        $frame[2] = ($length >> 56) & 255;
        $frame[3] = ($length >> 48) & 255;
        $frame[4] = ($length >> 40) & 255;
        $frame[5] = ($length >> 32) & 255;
        $frame[6] = ($length >> 24) & 255;
        $frame[7] = ($length >> 16) & 255;
        $frame[8] = ($length >> 8) & 255;
        $frame[9] = $length & 255;
    }

    // Добавяне на данните на съобщението към рамката
    foreach (str_split($message) as $char) {
        $frame[] = ord($char);
    }

    return implode(array_map('chr', $frame));
}

/**
 * Изпраща списък с текущо онлайн потребители към всички свързани клиенти.
 * @param array $clients Масив от активни клиентски сокети.
 * @param array $userList Масив от потребителски имена.
 */
function sendUserListToAllClients($clients, $userList) {
    $data = json_encode([
        'type' => 'user_list',
        'users' => $userList
    ]);
    foreach ($clients as $client) {
        sendMessage($client, $data);
    }
}
?>