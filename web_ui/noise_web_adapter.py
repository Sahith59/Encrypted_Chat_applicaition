"""
Adapter for Noise Protocol to work with the web interface.
This module provides the necessary interfaces to integrate the existing
Noise Protocol implementation with the Flask web application.
"""

import threading
import json
import queue
import logging
import time
import os
import sys

# Get the absolute path to relevant directories
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
implementation_path = os.path.join(parent_dir, 'noiseprotocol', 'Implementation')

# Add both paths to Python's module search path
sys.path.insert(0, implementation_path)  # Add Implementation dir first
sys.path.insert(0, parent_dir)  # Then add parent dir

# Now import using the fully qualified path
from noiseprotocol.Implementation.noise_chat_client import NoiseChatClient

# Configure logging
logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s: %(message)s')
logger = logging.getLogger('noise_web_adapter')

class NoiseWebAdapter:
    """
    Adapter class to integrate Noise Protocol with web interfaces.
    """
    
    def __init__(self):
        """Initialize the adapter."""
        self.clients = {}  # user_id -> client_info
        self.cleanup_thread = threading.Thread(target=self._cleanup_inactive_clients)
        self.cleanup_thread.daemon = True
        self.cleanup_thread.start()
    
    def create_client(self, user_id, username, host, port):
        """
        Create a new client connection.
        
        Args:
            user_id (str): Unique identifier for the user
            username (str): Username for the chat
            host (str): Server hostname or IP
            port (int): Server port
            
        Returns:
            bool: True if connection was successful, False otherwise
        """
        if user_id in self.clients:
            logger.warning(f"Client already exists for user {user_id}")
            return False
        
        try:
            # Create a new client instance
            client = NoiseChatClient(host=host, port=port, username=username)
            
            # Connect to the server
            connect_success = client.connect()
            
            if connect_success:
                # Create a message queue for this client
                message_queue = queue.Queue()
                
                # Set up the message receiver hook
                def message_receiver(message_data):
                    """Callback for received messages."""
                    message_queue.put(message_data)
                
                # Store client information
                self.clients[user_id] = {
                    'client': client,
                    'username': username,
                    'message_queue': message_queue,
                    'message_hook': message_receiver,
                    'message_thread': None,
                    'last_activity': time.time()
                }
                
                # Set username
                if client.set_username(username):
                    logger.info(f"Username set to {username} for user {user_id}")
                
                logger.info(f"Client created for user {user_id} with username {username}")
                return True
            else:
                logger.error(f"Failed to connect client for user {user_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error creating client: {e}")
            return False
    
    def disconnect_client(self, user_id):
        """
        Disconnect a client.
        
        Args:
            user_id (str): Unique identifier for the user
            
        Returns:
            bool: True if disconnection was successful, False otherwise
        """
        if user_id not in self.clients:
            logger.warning(f"No client found for user {user_id}")
            return False
        
        try:
            # Get client information
            client_info = self.clients[user_id]
            
            # Disconnect the client
            client_info['client'].disconnect()
            
            # Remove client information
            del self.clients[user_id]
            
            logger.info(f"Client disconnected for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error disconnecting client: {e}")
            return False
    
    def send_message(self, user_id, message):
        """
        Send a chat message.
        
        Args:
            user_id (str): Unique identifier for the user
            message (str): Message content
            
        Returns:
            bool: True if message was sent successfully, False otherwise
        """
        if user_id not in self.clients:
            logger.warning(f"No client found for user {user_id}")
            return False
        
        try:
            # Get client information
            client_info = self.clients[user_id]
            
            # Send the message
            success = client_info['client'].send_chat_message(message)
            
            # Update last activity time
            client_info['last_activity'] = time.time()
            
            if success:
                logger.info(f"Message sent for user {user_id}")
                return True
            else:
                logger.error(f"Failed to send message for user {user_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            return False
    
    def get_messages(self, user_id):
        """
        Get messages for a user.
        
        Args:
            user_id (str): Unique identifier for the user
            
        Returns:
            list: List of message objects
        """
        if user_id not in self.clients:
            logger.warning(f"No client found for user {user_id}")
            return []
        
        try:
            # Get client information
            client_info = self.clients[user_id]
            
            # Check if client is still connected
            if not client_info['client'].connected:
                logger.warning(f"Client not connected for user {user_id}")
                return []
            
            # Get messages from queue
            messages = []
            while not client_info['message_queue'].empty():
                messages.append(client_info['message_queue'].get_nowait())
            
            # Update last activity time
            client_info['last_activity'] = time.time()
            
            return messages
            
        except Exception as e:
            logger.error(f"Error getting messages: {e}")
            return []
    
    def get_client_status(self, user_id):
        """
        Get client connection status.
        
        Args:
            user_id (str): Unique identifier for the user
            
        Returns:
            dict: Status information or None if client not found
        """
        if user_id not in self.clients:
            return None
        
        try:
            # Get client information
            client_info = self.clients[user_id]
            
            # Update last activity time
            client_info['last_activity'] = time.time()
            
            return {
                'connected': client_info['client'].connected,
                'username': client_info['username'],
                'handshake_complete': client_info['client'].handshake_complete
            }
            
        except Exception as e:
            logger.error(f"Error getting client status: {e}")
            return None
    
    def send_file(self, user_id, file_path):
        """
        Send a file.
        
        Args:
            user_id (str): Unique identifier for the user
            file_path (str): Path to the file
            
        Returns:
            bool: True if file was sent successfully, False otherwise
        """
        if user_id not in self.clients:
            logger.warning(f"No client found for user {user_id}")
            return False
        
        try:
            # Get client information
            client_info = self.clients[user_id]
            
            # Send the file
            # This would need to be implemented in the NoiseChatClient class
            if hasattr(client_info['client'], 'send_file'):
                success = client_info['client'].send_file(file_path)
                
                # Update last activity time
                client_info['last_activity'] = time.time()
                
                if success:
                    logger.info(f"File sent for user {user_id}")
                    return True
                else:
                    logger.error(f"Failed to send file for user {user_id}")
                    return False
            else:
                logger.error(f"File sending not implemented in client")
                return False
                
        except Exception as e:
            logger.error(f"Error sending file: {e}")
            return False
    
    def _cleanup_inactive_clients(self):
        """
        Periodically cleanup inactive clients.
        """
        while True:
            try:
                # Sleep for a while
                time.sleep(60)  # Check every minute
                
                # Get current time
                current_time = time.time()
                
                # Find inactive clients (no activity for 30 minutes)
                inactive_users = []
                for user_id, client_info in self.clients.items():
                    if current_time - client_info['last_activity'] > 1800:  # 30 minutes
                        inactive_users.append(user_id)
                
                # Disconnect inactive clients
                for user_id in inactive_users:
                    logger.info(f"Disconnecting inactive client for user {user_id}")
                    self.disconnect_client(user_id)
                    
            except Exception as e:
                logger.error(f"Error in cleanup thread: {e}")