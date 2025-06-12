<?php

$host = '127.0.0.1'; 
$port = 8080;        

$socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
socket_set_option($socket, SOL_SOCKET, SO_REUSEADDR, 1);
socket_bind($socket, $host, $port);
socket_listen($socket);

$clients = []; 
$users = [];   

echo "WebSocket server started on $host:$port\n";

while (true) {
    $readSockets = array_values($clients);
    $readSockets[] = $socket;

    $write = null; 
    $except = null; 

    if (socket_select($readSockets, $write, $except, 0, 10) === false) {
        continue;
    }

    if (in_array($socket, $readSockets)) {
        $newSocket = socket_accept($socket); 
        if ($newSocket !== false) {
            $socketHash = spl_object_hash($newSocket); 
            $clients[$socketHash] = $newSocket; 
            echo "New client connected (hash: {$socketHash})\n";
        }
        $socketKey = array_search($socket, $readSockets);
        unset($readSockets[$socketKey]);    
    }

    foreach ($readSockets as $clientSocket) {
        $clientSocketHash = spl_object_hash($clientSocket);

        $data = @socket_recv($clientSocket, $buffer, 1024, 0);

        if ($data === false || $data == 0) { 
            $disconnectedUsername = 'Unknown';
            
            if (isset($clients[$clientSocketHash])) {
                if (isset($users[$clientSocketHash])) {
                    $disconnectedUsername = $users[$clientSocketHash];
                    unset($users[$clientSocketHash]); 
                }
                unset($clients[$clientSocketHash]); 
                socket_close($clientSocket); 
                echo "Client '{$disconnectedUsername}' disconnected (hash: {$clientSocketHash})\n";
                
                sendUserListToAllClients(array_values($clients), array_values($users));
            }
            continue;
        }

        $isHandshakeRequest = strpos($buffer, 'Sec-WebSocket-Key:') !== false;

        if ($isHandshakeRequest) {
            performHandshake($clientSocket, $buffer);
        } else {
            $unmaskedPayload = unmask($buffer);
            $opcode = $unmaskedPayload['opcode'];
            $message = $unmaskedPayload['data'];

            if ($opcode === 8) {
                $disconnectedUsername = 'Unknown';

                if (isset($clients[$clientSocketHash])) {
                    if (isset($users[$clientSocketHash])) {
                        $disconnectedUsername = $users[$clientSocketHash];
                        unset($users[$clientSocketHash]); 
                    }
                    unset($clients[$clientSocketHash]); 
                    socket_close($clientSocket); 
                    echo "Client '{$disconnectedUsername}' disconnected (hash: {$clientSocketHash})\n";

                    sendUserListToAllClients(array_values($clients), array_values($users));
                }
                continue;
            } elseif ($opcode === 1) { // Opcode 1 е текстов кадър (text frame)
                $decodedMessage = json_decode($message, true);

                if (json_last_error() === JSON_ERROR_NONE && isset($decodedMessage['type'])) {
                    switch ($decodedMessage['type']) {
                        case 'identify':
                            if (isset($decodedMessage['username']) && !empty($decodedMessage['username'])) {
                                $username = $decodedMessage['username'];
                                if (!isset($users[$clientSocketHash])) {
                                    $users[$clientSocketHash] = $username;
                                    echo "User '{$username}' identified via WebSocket (hash: {$clientSocketHash}).\n";

                                    sendUserListToAllClients(array_values($clients), array_values($users));
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
            } else {
                echo "Received unknown opcode ({$opcode}) from client hash: {$clientSocketHash}.\n";
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
    $opcode = ord($payload[0]) & 0x0F; // Extract the opcode

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

    return ['opcode' => $opcode, 'data' => $unmaskedtext];
}

function sendMessage($clientSocket, $message)
{
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
    foreach ($clients as $clientSocket) {
        sendMessage($clientSocket, $data);
    }
}
?>