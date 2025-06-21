// room_management.js - Enhanced implementation for room functionality

document.addEventListener('DOMContentLoaded', function() {
    // Get UI elements
    const createRoomBtn = document.getElementById('create-room-btn');
    const roomListBtn = document.getElementById('room-list-btn');
    const refreshRoomsBtn = document.getElementById('refresh-rooms-btn');
    const groupChatBtn = document.getElementById('group-chat-btn');
    
    // Attach event handlers if elements exist
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', function() {
            createRoom();
        });
    }
    
    if (refreshRoomsBtn) {
        refreshRoomsBtn.addEventListener('click', function() {
            refreshRoomList();
        });
    }
    
    if (groupChatBtn) {
        groupChatBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const roomListModal = new bootstrap.Modal(document.getElementById('roomListModal'));
            roomListModal.show();
            refreshRoomList();
        });
    }
    
    // Initialize when document is loaded
    initializeRoomManagement();
});

// Initialize room management
function initializeRoomManagement() {
    // Set up event delegation for room list
    const roomList = document.getElementById('room-list');
    if (roomList) {
        roomList.addEventListener('click', function(e) {
            // Check if join button was clicked
            if (e.target.classList.contains('join-room-btn')) {
                const roomId = e.target.getAttribute('data-room-id');
                joinRoom(roomId);
            }
            // Check if leave button was clicked
            else if (e.target.classList.contains('leave-room-btn')) {
                const roomId = e.target.getAttribute('data-room-id');
                leaveRoom(roomId);
            }
        });
    }
    
    // Auto-refresh room list when modal is shown
    const roomListModal = document.getElementById('roomListModal');
    if (roomListModal) {
        roomListModal.addEventListener('shown.bs.modal', function() {
            refreshRoomList();
        });
    }
    
    // Set active room from current URL if available
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
        document.getElementById('active-room').textContent = roomParam;
    }
}

// Create a room
function createRoom() {
    const roomId = document.getElementById('new-room-id').value.trim();
    const roomName = document.getElementById('new-room-name').value.trim();
    const description = document.getElementById('new-room-description').value.trim();
    
    if (!roomId || !roomName) {
        showAlert('Room ID and name are required', 'danger');
        return;
    }
    
    // Show loading spinner on button
    const createButton = document.querySelector('[onclick="createRoom()"]');
    const originalText = createButton.innerHTML;
    createButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating...';
    createButton.disabled = true;
    
    fetch('/create_room', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            room_id: roomId,
            room_name: roomName,
            description: description
        }),
    })
    .then(response => response.json())
    .then(data => {
        // Restore button
        createButton.innerHTML = originalText;
        createButton.disabled = false;
        
        if (data.success) {
            // Hide modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createRoomModal'));
            modal.hide();
            
            // Show success message
            showAlert('Room created successfully', 'success');
            
            // Refresh room list
            refreshRoomList();
            
            // Auto-join the newly created room
            joinRoom(roomId);
            
            // Clear form
            document.getElementById('new-room-id').value = '';
            document.getElementById('new-room-name').value = '';
            document.getElementById('new-room-description').value = '';
        } else {
            showAlert(data.message || 'Failed to create room', 'danger');
        }
    })
    .catch(error => {
        // Restore button
        createButton.innerHTML = originalText;
        createButton.disabled = false;
        
        console.error('Error:', error);
        showAlert('Network error, please try again', 'danger');
    });
}

// Refresh room list
function refreshRoomList() {
    const roomList = document.getElementById('room-list');
    if (!roomList) return;
    
    roomList.innerHTML = '<div class="text-center my-3"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Loading rooms...</p></div>';
    
    fetch('/rooms')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                renderRoomList(data.rooms || []);
            } else {
                roomList.innerHTML = '<div class="alert alert-danger">Failed to load rooms: ' + (data.message || 'Unknown error') + '</div>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            roomList.innerHTML = '<div class="alert alert-danger">Failed to load rooms: ' + error.message + '</div>';
        });
}

// Render room list
function renderRoomList(rooms) {
    const roomList = document.getElementById('room-list');
    if (!roomList) return;
    
    if (!rooms || rooms.length === 0) {
        roomList.innerHTML = '<div class="text-center text-muted my-3">No rooms available</div>';
        return;
    }
    
    // Get current active room
    const activeRoomElement = document.getElementById('active-room');
    const activeRoom = activeRoomElement ? activeRoomElement.textContent.trim() : null;
    
    let html = '';
    rooms.forEach(room => {
        const isActive = activeRoom === room.name || activeRoom === room.id;
        const buttonClass = isActive ? 'leave-room-btn' : 'join-room-btn';
        const buttonText = isActive ? 'Leave' : 'Join';
        const buttonVariant = isActive ? 'danger' : 'primary';
        
        html += `
            <div class="room-item p-3 border-bottom">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-bold">${escapeHtml(room.name)}</div>
                        <div class="small text-muted">ID: ${escapeHtml(room.id)}</div>
                        ${room.description ? `<div class="small">${escapeHtml(room.description)}</div>` : ''}
                        <div class="small">Members: ${room.member_count || 0}</div>
                    </div>
                    <div class="d-flex">
                        <button class="btn btn-sm btn-outline-${buttonVariant} ${buttonClass}" data-room-id="${escapeHtml(room.id)}">${buttonText}</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    roomList.innerHTML = html;
}

// Join a room
function joinRoom(roomId) {
    if (!roomId) return;
    
    fetch('/join_room', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            room_id: roomId
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update active room display
            const activeRoomElement = document.getElementById('active-room');
            if (activeRoomElement) {
                activeRoomElement.textContent = data.room.name || roomId;
            }
            
            // Show success message
            showAlert(`Joined room ${data.room.name || roomId}`, 'success');
            
            // Hide modal if it's open
            const modal = bootstrap.Modal.getInstance(document.getElementById('roomListModal'));
            if (modal) {
                modal.hide();
            }
            
            // Clear chat messages area and add room joined message
            const chatMessages = document.getElementById('chat-messages');
            if (chatMessages) {
                chatMessages.innerHTML += `<div class="system-message">You joined the room: ${data.room.name || roomId}</div>`;
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
            
            // Update URL without refreshing the page
            const url = new URL(window.location);
            url.searchParams.set('room', roomId);
            window.history.pushState({}, '', url);
        } else {
            showAlert(data.message || 'Failed to join room', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Network error, please try again', 'danger');
    });
}

// Leave a room
function leaveRoom(roomId) {
    if (!roomId) return;
    
    fetch('/leave_room', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            room_id: roomId
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update active room (should default to Main Room)
            const activeRoomElement = document.getElementById('active-room');
            if (activeRoomElement) {
                activeRoomElement.textContent = 'Main Room';
            }
            
            // Show success message
            showAlert(data.message || 'Left room successfully', 'success');
            
            // Refresh room list
            refreshRoomList();
            
            // Clear chat messages area and add room left message
            const chatMessages = document.getElementById('chat-messages');
            if (chatMessages) {
                chatMessages.innerHTML += `<div class="system-message">You left the room: ${roomId}</div>`;
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
            
            // Update URL without refreshing the page
            const url = new URL(window.location);
            url.searchParams.delete('room');
            window.history.pushState({}, '', url);
            
            // If there's a new active room in the response, join it
            if (data.new_active_room) {
                setTimeout(() => {
                    joinRoom(data.new_active_room);
                }, 500);
            }
        } else {
            showAlert(data.message || 'Failed to leave room', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Network error, please try again', 'danger');
    });
}

// Helper function to show alerts
function showAlert(message, type = 'info') {
    const alertContainer = document.createElement('div');
    alertContainer.className = `alert alert-${type} alert-dismissible fade show`;
    alertContainer.role = 'alert';
    alertContainer.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Find a good place to show the alert
    const container = document.querySelector('.container-fluid .row:first-child');
    if (container) {
        container.prepend(alertContainer);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            alertContainer.classList.remove('show');
            setTimeout(() => alertContainer.remove(), 150);
        }, 5000);
    }
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}