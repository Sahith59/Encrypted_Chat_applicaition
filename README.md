# Noise Protocol Secure Chat Application

A secure chat application that implements the Noise Protocol Framework to provide end-to-end encryption for messages and file transfers.

## What is This Project?

This project is a complete chat application that demonstrates how the Noise Protocol works in a real application. It includes:

- A secure chat server that manages multiple client connections
- A command-line client for basic chatting
- A web interface with additional features like file sharing
- Security testing tools to verify the implementation
- Performance comparison with other security protocols

My implementation focuses on making secure communication accessible and understandable, while providing a practical example of modern cryptography.

## Features

- **Secure Messaging**: End-to-end encrypted chat using the Noise Protocol
- **Multiple Chat Rooms**: Create and join different chat rooms
- **File Transfers**: Send and receive encrypted files
- **Web Interface**: Easy-to-use browser-based chat client
- **Command-Line Interface**: Lightweight text-based client
- **Security Testing**: Built-in tools to verify protocol implementation
- **Performance Analysis**: Compare Noise Protocol with TLS 1.3 and unencrypted communication

## Getting Started

### Requirements

- Python 3.7 or newer
- A modern web browser for the web interface

### Installation

1. **Clone or download the project**

2. **Set up a virtual environment (recommended)**
   ```bash
   # Create virtual environment
   python -m venv venv
   
   # Activate on Windows
   venv\Scripts\activate
   
   # Activate on macOS/Linux
   source venv/bin/activate
   ```

3. **Install requirements**
   ```bash
   # Install dependencies
   pip install -r requirements.txt
   
   # Install noiseprotocol package in development mode
   pip install -e .
   ```

   Or use the automated installer:
   ```bash
   python install.py
   ```

## How to Run

The application has two main components: the server and clients (either command-line or web-based).

### Starting the Server

1. Open a terminal window and navigate to the implementation directory:
   ```bash
   cd noiseprotocol/Implementation
   ```

2. Start the server:
   ```bash
   python noise_chat_server.py
   ```

   This will start the server on default port 8000. You can specify a different port with:
   ```bash
   python noise_chat_server.py --port 9000
   ```

3. The server will display:
   ```
   Noise Protocol Chat Server started on 0.0.0.0:8000
   Server commands: users, broadcast <message>, quit
   >
   ```

4. You can use these server commands:
   - `users` - Shows connected users
   - `broadcast <message>` - Sends a message to all users
   - `quit` - Shuts down the server

### Using the Web Interface

1. Open a new terminal window and navigate to the web UI directory:
   ```bash
   cd web_ui
   ```

2. Start the web server:
   ```bash
   python app.py
   ```

3. Open your browser and go to:
   ```
   http://localhost:5001
   ```

4. Connect to the chat server:
   - Enter your username
   - Enter the server address (localhost if running locally)
   - Enter the server port (default: 8000)
   - Click "Connect"

5. You'll be connected to the main chat room where you can send and receive messages.

### Using the Command-Line Client

1. Open a new terminal window and navigate to the implementation directory:
   ```bash
   cd noiseprotocol/Implementation
   ```

2. Start the client:
   ```bash
   python noise_chat_client.py --username YourName
   ```

   Or connect to a specific server:
   ```bash
   python noise_chat_client.py --host server-address --port 8000 --username YourName
   ```

3. Use these client commands:
   - `/nick <new-name>` - Change your username
   - `/ping` - Test connection latency
   - `/quit` - Disconnect and exit
   - Type any other text to send a message

## Web Interface Features

### Chat Rooms

The web interface allows you to create and join different chat rooms:

- **Create Room**: Click "Create Room" in the sidebar, enter a room ID and name
- **Join Room**: Click "Join" next to a room in the list
- **Leave Room**: Click "Leave" in the room header
- **View Members**: See who's in the current room

### File Sharing

You can securely share files with other users:

1. Click the paperclip icon in the message input area
2. Select a file from your device (up to 50MB)
3. The file will be encrypted and sent to everyone in the current room
4. Recipients can click the file link to download it

### Security Testing

You can verify the security of the Noise Protocol implementation:

1. Connect to the server
2. Click "Security Report" in the sidebar
3. Click "Run Tests" to check:
   - Handshake integrity
   - Encryption correctness
   - Replay attack protection
   - Authentication verification

### Performance Comparison

You can compare the performance of different security protocols:

1. Connect to the server
2. Click "Performance Stats" in the sidebar
3. Configure test parameters:
   - Number of messages
   - Message size
   - Protocols to compare
4. View results comparing:
   - Handshake time
   - Message latency
   - Throughput (messages per second)
   - CPU and memory usage

## Technical Details

### How the Noise Protocol Works in This Implementation

My implementation uses the XX handshake pattern, which provides mutual authentication:

1. **Handshake Phase**:
   - The client initiates the connection with the server
   - Both parties verify each other's identity
   - They establish shared encryption keys

2. **Transport Phase**:
   - All messages are encrypted with ChaCha20-Poly1305
   - Each message includes authentication to prevent tampering
   - Message counters prevent replay attacks

### File Structure

```
noiseprotocol/Implementation/
├── noise_chat_server.py       # Server implementation
├── noise_chat_client.py       # Command-line client
├── noise_protocol_handler.py  # Core protocol implementation
├── security_test_script.py    # Security verification tools
└── performance_comparison.py  # Performance testing

web_ui/
├── app.py                     # Flask web application
├── noise_web_adapter.py       # Protocol adapter for web
├── static/                    # CSS, JavaScript files
└── templates/                 # HTML templates
```

## Troubleshooting

### Connection Issues

- **Can't connect to server**: Make sure the server is running and ports match
- **Web interface not loading**: Check that Flask server is running on port 5001
- **Connection drops**: Check network connection and server status

### Common Problems

- **"ImportError"**: Make sure you installed the package with `pip install -e .`
- **File upload errors**: Check that the upload directory exists and is writable
- **Message not being received**: Ensure both users are in the same chat room

## Conclusion

This project demonstrates how the Noise Protocol can be implemented in a real-world application to provide secure communication. The combination of command-line and web interfaces makes it accessible to different types of users, while the security testing and performance comparison tools help understand the benefits of the protocol.
