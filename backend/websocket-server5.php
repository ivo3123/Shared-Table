<?php
$host = '127.0.0.1'; 
$port = 8080;        

$socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
socket_set_option($socket, SOL_SOCKET, SO_REUSEADDR, 1);
socket_bind($socket, $host, $port);
socket_listen($socket);

// Променете $clients да бъде асоциативен масив: key = spl_object_hash(socket) => value = socket resource
$clients = []; 
$users = [];   // key = spl_object_hash(socket) => value = username

echo "WebSocket server started on $host:$port\n";

while (true) {
    // Създаваме масив от сокети за socket_select, който съдържа РЕСУРСИТЕ, не техните хешове
    $readSockets = array_values($clients); // Взимаме само ресурс обектите от $clients
    $readSockets[] = $socket; // Добавяме главния слушащ сокет

    $write = null; 
    $except = null; 

    // socket_select ще промени $readSockets на тези, които са активни
    if (socket_select($readSockets, $write, $except, 0, 10) === false) {
        echo "Socket select error: " . socket_strerror(socket_last_error()) . "\n";
        continue;
    }

    // Проверяваме дали главният слушащ сокет има активност (нова връзка)
    if (in_array($socket, $readSockets)) {
        $newSocket = socket_accept($socket); // Приемаме новата връзка
        if ($newSocket !== false) {
            $socketHash = spl_object_hash($newSocket); // Генерираме уникален хеш за новия сокет
            $clients[$socketHash] = $newSocket; // Добавяме сокета към масива с неговия хеш
            echo "New client connected (hash: {$socketHash})\n";
        }
        // Премахваме главния сокет от $readSockets, за да не го обработваме като клиент по-долу
        $socketKey = array_search($socket, $readSockets);
        unset($readSockets[$socketKey]);    
    }

    // Обхождаме всички сокети, които имат активност
    foreach ($readSockets as $clientSocket) {
        // Уникален хеш за текущия клиентски сокет
        $clientSocketHash = spl_object_hash($clientSocket);

        // Опитваме се да прочетем данни от клиентския сокет
        $data = @socket_recv($clientSocket, $buffer, 1024, 0);

        // Проверяваме дали четенето е неуспешно (false) или е прочетено 0 байта (клиентът се е откачил)
        if ($data === false || $data == 0) { 
            $disconnectedUsername = 'Unknown';
            
            // Проверяваме дали този сокет съществува в нашия $clients масив
            if (isset($clients[$clientSocketHash])) {
                // Ако сокетът е имал асоциирано потребителско име, го взимаме и премахваме
                if (isset($users[$clientSocketHash])) {
                    $disconnectedUsername = $users[$clientSocketHash];
                    unset($users[$clientSocketHash]); // Премахваме потребителя от списъка с активни потребители
                }
                unset($clients[$clientSocketHash]); // Премахваме сокета от масива $clients
                socket_close($clientSocket); // Затваряме сокета
                echo "Client '{$disconnectedUsername}' disconnected (hash: {$clientSocketHash})\n";
                
                // Изпращаме актуализиран списък с потребители на всички останали
                sendUserListToAllClients(array_values($clients), array_values($users)); // Изпращаме само ресурс обектите

                // Изпращаме системно съобщение за напускане на всички останали
                $systemMessage = json_encode([
                    'type' => 'system_message',
                    'message' => "{$disconnectedUsername} напусна чата."
                ]);
                foreach ($clients as $client) { // Обхождаме само останалите активни клиенти
                    sendMessage($client, $systemMessage);
                }
            }
            continue; // Преминаваме към следващия клиент в цикъла
        }

        $isHandshakeRequest = strpos($buffer, 'Sec-WebSocket-Key:') !== false;

        if ($isHandshakeRequest) {
            performHandshake($clientSocket, $buffer);
        } else {
            $message = unmask($buffer);

            // Опитваме се да декодираме съобщението като JSON
            $decodedMessage = json_decode($message, true);

            if (json_last_error() === JSON_ERROR_NONE && isset($decodedMessage['type'])) {
                switch ($decodedMessage['type']) {
                    case 'identify':
                        if (isset($decodedMessage['username']) && !empty($decodedMessage['username'])) {
                            $username = $decodedMessage['username'];
                            // Използваме $clientSocketHash за уникална идентификация
                            if (!isset($users[$clientSocketHash])) {
                                $users[$clientSocketHash] = $username; // Асоциираме хеша на сокета с потребителското име
                                echo "User '{$username}' identified via WebSocket (hash: {$clientSocketHash}).\n";
                                
                                // Изпращаме АКТУАЛИЗИРАН списък с потребители на ВСИЧКИ клиенти
                                sendUserListToAllClients(array_values($clients), array_values($users));

                                // Изпращаме системно съобщение за присъединяване на ВСИЧКИ ОСТАНАЛИ (без изпращача)
                                $systemMessage = json_encode([
                                    'type' => 'system_message',
                                    'message' => "{$username} се присъедини към чата."
                                ]);
                                foreach ($clients as $client) {
                                    // Проверяваме по hash, за да не изпращаме на изпращача
                                    if (spl_object_hash($client) !== $clientSocketHash) { 
                                        sendMessage($client, $systemMessage);
                                    }
                                }
                            } else {
                                echo "User '{$username}' (socket hash: {$clientSocketHash}) already identified. Ignoring duplicate 'identify' message.\n";
                            }
                        }
                        break;
                    default:
                        echo "Received unknown JSON type: " . $decodedMessage['type'] . " from socket hash: {$clientSocketHash}.\n";
                        break;
                }
            } else {
                echo "Received non-JSON or malformed message from client hash: {$clientSocketHash}: " . $message . "\n";
            }
        }
    }
}


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

function unmask($payload)
{
    $length = ord($payload[1]) & 127; 
    if ($length == 126) { 
        $masks = substr($payload, 4, 4);
        $data = substr($payload, 8);
    } elseif ($length == 127) { 
        $masks = substr($payload, 10, 4);
        $data = substr($payload, 14);
    } else { 
        $masks = substr($payload, 2, 4);
        $data = substr($payload, 6);
    }

    $unmaskedtext = '';
    for ($i = 0; $i < strlen($data); ++$i) {
        $unmaskedtext .= $data[$i] ^ $masks[$i % 4];
    }
    return $unmaskedtext;
}

function sendMessage($clientSocket, $message)
{
    // Забележка: Сървърите обикновено НЕ маскират изходящите данни към клиентите.
    // Тук запазваме маскирането, ако вашият клиент очаква маскирани данни.
    $message = mask($message); 
    socket_write($clientSocket, $message, strlen($message));
}

function mask($message)
{
    $frame = [];
    $frame[0] = 129;

    $length = strlen($message);
    if ($length <= 125) {
        $frame[1] = $length;
    } elseif ($length <= 65535) { 
        $frame[1] = 126;
        $frame[2] = ($length >> 8) & 255;
        $frame[3] = $length & 255;
    } else { 
        $frame[1] = 127;
        $frame[2] = ($length >> 56) & 255;
        $frame[3] = ($length >> 48) & 255;
        $frame[4] = ($length >> 40) & 255;
        $frame[5] = ($length >> 32) & 255;
        $frame[6] = ($length >> 24) & 255;
        $frame[7] = ($length >> 16) & 255;
        $frame[8] = ($length >> 8) & 255;
        $frame[9] = $length & 255;
    }

    foreach (str_split($message) as $char) {
        $frame[] = ord($char);
    }

    return implode(array_map('chr', $frame));
}

function sendUserListToAllClients($clients, $userList) {
    $data = json_encode([
        'type' => 'user_list',
        'users' => $userList
    ]);
    foreach ($clients as $clientSocket) { // Обхождаме ресурс обектите
        sendMessage($clientSocket, $data);
    }
}
?>