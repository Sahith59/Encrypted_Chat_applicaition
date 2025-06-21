// Noise Protocol Chat Application
$(document).ready(function() {
    // Initialize variables
    let connected = false;
    let messagePollingInterval = null;
    let activeRoom = 'main';
    let memberPollingInterval = null;
    let securityTestInterval = null;
    let performanceTestInterval = null;
    const fileModal = new bootstrap.Modal(document.getElementById('fileModal'));
    
    // Initialize modals
    const securityReportModal = new bootstrap.Modal(document.getElementById('securityReportModal'));
    const performanceStatsModal = new bootstrap.Modal(document.getElementById('performanceStatsModal'));
    const groupChatModal = new bootstrap.Modal(document.getElementById('groupChatModal'));
    const fileTransferModal = new bootstrap.Modal(document.getElementById('fileTransferModal'));
    
    // Set up sidebar feature buttons
    $('#group-chat-btn').on('click', function(e) {
        e.preventDefault();
        groupChatModal.show();
        // Load rooms when modal is opened
        refreshRoomListInModal();
    });
    
    $('#file-transfer-btn').on('click', function(e) {
        e.preventDefault();
        fileTransferModal.show();
        // Update room dropdown in file transfer modal
        updateFileTransferRooms();
        // Load received files
        loadReceivedFiles();
    });
    
    $('#security-report-btn').on('click', function(e) {
        e.preventDefault();
        securityReportModal.show();
        // Auto-run security tests when modal is opened
        runSecurityTests();
    });
    
    $('#performance-stats-btn').on('click', function(e) {
        e.preventDefault();
        performanceStatsModal.show();
    });
    
    // DOM elements
    const $connectForm = $('#connect-form');
    const $connectionPanel = $('#connection-panel');
    const $statusPanel = $('#status-panel');
    const $chatMessages = $('#chat-messages');
    const $messageForm = $('#message-form');
    const $messageInput = $('#message-input');
    const $sendBtn = $('#send-btn');
    const $fileBtn = $('#file-btn');
    const $disconnectBtn = $('#disconnect-btn');
    const $connectionAlert = $('#connection-alert');
    const $connectionAlertMessage = $('#connection-alert-message');

    // Room management
    // Initialize event listeners for room interactions
    document.addEventListener('click', function(event) {
        // Check if the clicked element is a Leave button
        if (event.target.classList.contains('leave-room-btn') || 
            (event.target.tagName === 'BUTTON' && event.target.textContent.trim() === 'Leave')) {
            event.preventDefault();
            
            // Get room ID from the button's data attribute or from the parent container
            let roomId;
            if (event.target.hasAttribute('data-room-id')) {
                roomId = event.target.getAttribute('data-room-id');
            } else {
                // Try to find the room ID from the surrounding elements
                const roomSection = event.target.closest('.room-item') || event.target.closest('section');
                if (roomSection) {
                    const idElement = roomSection.querySelector('.small:contains("ID:")');
                    if (idElement) {
                        // Extract the ID from text like "ID: main"
                        const idText = idElement.textContent;
                        const match = idText.match(/ID:\s*(\S+)/);
                        if (match && match[1]) {
                            roomId = match[1];
                        }
                    }
                }
            }
            
            // If we've found a room ID, call the leaveRoom function
            if (roomId) {
                leaveRoom(roomId);
            } else {
                console.error('Could not determine room ID for leave button');
                showAlert('Could not determine which room to leave', 'danger');
            }
        }
        
        // Check if the clicked element is a Join button
        if (event.target.classList.contains('join-room-btn') || 
            (event.target.tagName === 'BUTTON' && event.target.textContent.trim() === 'Join')) {
            event.preventDefault();
            
            // Get room ID from the button's data attribute or from the parent container
            let roomId;
            if (event.target.hasAttribute('data-room-id')) {
                roomId = event.target.getAttribute('data-room-id');
            } else {
                // Try to find the room ID from the surrounding elements
                const roomSection = event.target.closest('.room-item') || event.target.closest('section');
                if (roomSection) {
                    const idElement = roomSection.querySelector('.small:contains("ID:")');
                    if (idElement) {
                        // Extract the ID from text like "ID: main"
                        const idText = idElement.textContent;
                        const match = idText.match(/ID:\s*(\S+)/);
                        if (match && match[1]) {
                            roomId = match[1];
                        }
                    }
                }
            }
            
            // If we've found a room ID, call the joinRoom function
            if (roomId) {
                joinRoom(roomId);
            } else {
                console.error('Could not determine room ID for join button');
                showAlert('Could not determine which room to join', 'danger');
            }
        }
    });
    
    // Update the active room display
    function updateActiveRoom() {
        const activeRoomEl = document.getElementById('active-room');
        if (activeRoomEl) {
            activeRoomEl.textContent = activeRoom === 'main' ? 'Main Room' : activeRoom;
        }
    }
    
    // Create a room
    function createRoom() {
        const roomId = document.getElementById('new-room-id').value.trim();
        const roomName = document.getElementById('new-room-name').value.trim();
        const description = document.getElementById('new-room-description').value.trim();
        
        if (!roomId || !roomName) {
            showError('Room ID and name are required');
            return;
        }
        
        // Show loading state
        const createButton = document.querySelector('[onclick="createRoom()"], #create-room-btn');
        if (createButton) {
            const originalText = createButton.innerHTML;
            createButton.disabled = true;
            createButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating...';
        }
        
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
            if (createButton) {
                createButton.innerHTML = originalText;
                createButton.disabled = false;
            }
            
            if (data.success) {
                // Hide modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('createRoomModal'));
                if (modal) modal.hide();
                
                // Show success message
                showSuccess('Room created successfully');
                
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
            if (createButton) {
                createButton.innerHTML = 'Create Room';
                createButton.disabled = false;
            }
            
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
                    throw new Error(`HTTP error ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    renderRoomList(data.rooms || []);
                } else {
                    roomList.innerHTML = `<div class="alert alert-danger">Failed to load rooms: ${data.message || 'Unknown error'}</div>`;
                }
            })
            .catch(error => {
                console.error('Error fetching rooms:', error);
                roomList.innerHTML = `<div class="alert alert-danger">Error loading rooms: ${error.message}</div>`;
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
        const activeRoomEl = document.getElementById('active-room');
        const activeRoomName = activeRoomEl ? activeRoomEl.textContent.trim() : 'Main Room';
        
        // Get room ID from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const roomIdFromUrl = urlParams.get('room');
        
        let html = '';
        rooms.forEach(room => {
            const isActive = (room.name === activeRoomName) || 
                            (room.id === activeRoom) || 
                            (room.id === roomIdFromUrl) ||
                            (activeRoomName === 'Main Room' && room.id === 'main');
            
            const buttonClass = isActive ? 'btn-outline-danger' : 'btn-outline-primary';
            const buttonText = isActive ? 'Leave' : 'Join';
            const actionClass = isActive ? 'leave-room-btn' : 'join-room-btn';
            
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
                            <button class="btn btn-sm ${buttonClass} ${actionClass}" data-room-id="${escapeHtml(room.id)}">${buttonText}</button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        roomList.innerHTML = html;
    }

    // Join a room with improved animations
    function joinRoom(roomId) {
        if (!roomId) return;
        
        // Show loading spinner on button if found
        const joinBtn = document.querySelector(`button[data-room-id="${roomId}"]`);
        if (joinBtn) {
            const originalText = joinBtn.textContent;
            joinBtn.disabled = true;
            joinBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Joining...';
        }
        
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
            // Reset button state if found
            if (joinBtn) {
                joinBtn.disabled = false;
                joinBtn.textContent = 'Join';
            }
            
            if (data.success) {
                // Update active room
                activeRoom = roomId;
                const activeRoomEl = document.getElementById('active-room');
                if (activeRoomEl) {
                    // Use a nice transition effect
                    activeRoomEl.style.transition = 'color 0.3s ease';
                    activeRoomEl.style.color = '#0d6efd'; // Highlight color
                    activeRoomEl.textContent = data.room.name || roomId;
                    
                    setTimeout(() => {
                        activeRoomEl.style.color = ''; // Reset color
                    }, 1000);
                }
                
                // Show success message
                showSuccess(`Joined room ${data.room.name || roomId}`);
                
                // Hide modal if it's open
                const modal = bootstrap.Modal.getInstance(document.getElementById('roomListModal'));
                if (modal) {
                    modal.hide();
                }
                
                // Update URL without refreshing the page
                const url = new URL(window.location);
                url.searchParams.set('room', roomId);
                window.history.pushState({}, '', url);
                
                // Show room members
                showRoomMembers(roomId);
                
                // Start polling for members
                startMemberPolling(roomId);
                
                // Refresh messages for this room
                refreshMessages(roomId);
                
                // Add a simple visual feedback
                if (activeRoomEl) {
                    const roomHeader = activeRoomEl.closest('.room-header');
                    if (roomHeader) {
                        roomHeader.style.backgroundColor = '#e7f1ff';
                        setTimeout(() => {
                            roomHeader.style.transition = 'background-color 0.5s ease';
                            roomHeader.style.backgroundColor = '';
                        }, 300);
                    }
                }
            } else {
                showAlert(data.message || 'Failed to join room', 'danger');
            }
        })
        .catch(error => {
            // Reset button state if found
            if (joinBtn) {
                joinBtn.disabled = false;
                joinBtn.textContent = 'Join';
            }
            
            console.error('Error:', error);
            showAlert('Network error, please try again', 'danger');
        });
    }

    // Leave a room with improved animations
    function leaveRoom(roomId) {
        if (!roomId) return;
        
        // Show loading state
        const leaveBtn = document.querySelector(`button[data-room-id="${roomId}"]`) || 
                        document.querySelector('.leave-room-btn');
                        if (leaveBtn) {
                            const originalText = leaveBtn.textContent;
                            leaveBtn.disabled = true;
                            leaveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Leaving...';
                        }
                        
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
                            // Reset button state if found
                            if (leaveBtn) {
                                leaveBtn.disabled = false;
                                leaveBtn.textContent = 'Leave';
                            }
                            
                            if (data.success) {
                                // Show success message
                                showSuccess(data.message || 'Left room successfully');
                                
                                // Reset active room to Main Room with animation
                                activeRoom = 'main';
                                const activeRoomEl = document.getElementById('active-room');
                                if (activeRoomEl) {
                                    activeRoomEl.style.transition = 'color 0.3s ease';
                                    activeRoomEl.style.color = '#dc3545'; // Exit color
                                    setTimeout(() => {
                                        activeRoomEl.textContent = 'Main Room';
                                        activeRoomEl.style.color = '#0d6efd'; // Return to normal
                                    }, 300);
                                }
                                
                                // Close the modal if it's open
                                const roomListModal = bootstrap.Modal.getInstance(document.getElementById('roomListModal'));
                                if (roomListModal) {
                                    roomListModal.hide();
                                }
                                
                                // Refresh room list
                                refreshRoomList();
                                
                                // Clear URL parameter
                                const url = new URL(window.location);
                                url.searchParams.delete('room');
                                window.history.pushState({}, '', url);
                                
                                // Stop member polling
                                if (memberPollingInterval) {
                                    clearInterval(memberPollingInterval);
                                    memberPollingInterval = null;
                                }
                                
                                // Remove members panel with animation
                                const membersPanel = document.getElementById('room-members-panel');
                                if (membersPanel) {
                                    membersPanel.style.transition = 'all 0.3s ease';
                                    membersPanel.style.opacity = '0';
                                    membersPanel.style.maxHeight = '0';
                                    setTimeout(() => {
                                        membersPanel.remove();
                                    }, 300);
                                }
                                
                                // Auto-join Main Room
                                setTimeout(() => {
                                    joinRoom('main');
                                }, 500);
                            } else {
                                showAlert(data.message || 'Failed to leave room', 'danger');
                            }
                        })
                        .catch(error => {
                            // Reset button state if found
                            if (leaveBtn) {
                                leaveBtn.disabled = false;
                                leaveBtn.textContent = 'Leave';
                            }
                            
                            console.error('Error:', error);
                            showAlert('Network error, please try again', 'danger');
                        });
                    }
                
                    // Show room members
                    function showRoomMembers(roomId) {
                        // Add a members panel to the chat interface if it doesn't exist
                        let membersPanel = document.getElementById('room-members-panel');
                        if (!membersPanel) {
                            const chatContainer = document.querySelector('.card');
                            if (!chatContainer) return;
                            
                            membersPanel = document.createElement('div');
                            membersPanel.id = 'room-members-panel';
                            membersPanel.className = 'room-members p-2 border-bottom bg-light';
                            membersPanel.innerHTML = '<div class="fw-bold"><i class="bi bi-people-fill me-2"></i>Room Members:</div><div id="room-members-list" class="small"></div>';
                            
                            // Insert after the room header
                            const roomHeader = document.querySelector('.room-header');
                            if (roomHeader) {
                                roomHeader.insertAdjacentElement('afterend', membersPanel);
                            } else {
                                // If no room header, insert at the beginning of the card body
                                const cardBody = document.querySelector('.card-body');
                                if (cardBody) {
                                    cardBody.prepend(membersPanel);
                                }
                            }
                        }
                        
                        // Show loading state
                        const membersList = document.getElementById('room-members-list');
                        if (membersList) {
                            membersList.innerHTML = '<div class="text-center"><i class="bi bi-hourglass-split me-2"></i>Loading members...</div>';
                            
                            fetch(`/room_info/${roomId}`)
                                .then(response => response.json())
                                .then(data => {
                                    if (data.success) {
                                        if (data.room.members.length === 0) {
                                            membersList.innerHTML = '<div class="text-muted text-center">No members</div>';
                                        } else {
                                            let html = '<ul class="list-unstyled mb-0">';
                                            data.room.members.forEach(member => {
                                                html += `<li>
                                                    <i class="bi bi-person-fill me-1"></i> 
                                                    <span class="${member.is_current_user ? 'fw-bold text-primary' : ''}">${escapeHtml(member.username)}</span>
                                                    ${member.is_current_user ? ' <span class="badge bg-primary">You</span>' : ''}
                                                </li>`;
                                            });
                                            html += '</ul>';
                                            membersList.innerHTML = html;
                                            
                                            // Add a nice animation for the member list
                                            const members = membersList.querySelectorAll('li');
                                            members.forEach((member, index) => {
                                                member.style.opacity = '0';
                                                member.style.transform = 'translateY(10px)';
                                                member.style.transition = 'all 0.3s ease';
                                                
                                                setTimeout(() => {
                                                    member.style.opacity = '1';
                                                    member.style.transform = 'translateY(0)';
                                                }, 100 * index);
                                            });
                                        }
                                    } else {
                                        membersList.innerHTML = '<div class="text-danger text-center">Could not load members</div>';
                                    }
                                })
                                .catch(error => {
                                    console.error('Error loading room members:', error);
                                    membersList.innerHTML = '<div class="text-danger text-center">Error loading members</div>';
                                });
                        }
                    }
                
                    // Start member polling
                    function startMemberPolling(roomId) {
                        // Clear any existing polling
                        if (memberPollingInterval) {
                            clearInterval(memberPollingInterval);
                        }
                        
                        // Poll every 5 seconds
                        memberPollingInterval = setInterval(() => {
                            showRoomMembers(roomId);
                        }, 5000);
                    }
                
                    // Refresh messages for a specific room
                    function refreshMessages(roomId) {
                        $.get(`/messages?room=${roomId}`)
                            .done(function(data) {
                                if (data.success) {
                                    // Clear existing messages
                                    $chatMessages.html('<div class="system-message">Beginning of secure conversation</div>');
                                    
                                    // Display messages for this room
                                    if (data.messages && data.messages.length > 0) {
                                        data.messages.forEach(message => {
                                            if (message.type === 'system') {
                                                addSystemMessage(message.content);
                                            } else {
                                                addMessageToChat(message);
                                            }
                                        });
                                    }
                                    
                                    // Scroll to bottom
                                    $chatMessages.scrollTop($chatMessages[0].scrollHeight);
                                }
                            })
                            .fail(function() {
                                console.error("Failed to fetch messages for room");
                            });
                    }
                    
                    // Functions for handling UI feedback
                    function showError(message) {
                        $connectionAlert.removeClass('d-none');
                        $connectionAlertMessage.text(message);
                        setTimeout(() => {
                            $connectionAlert.addClass('d-none');
                        }, 5000);
                    }
                    
                    // Show a success alert
                    function showSuccess(message) {
                        const alertContainer = document.createElement('div');
                        alertContainer.className = 'alert alert-success alert-dismissible fade show';
                        alertContainer.role = 'alert';
                        alertContainer.style.position = 'fixed';
                        alertContainer.style.top = '20px';
                        alertContainer.style.right = '20px';
                        alertContainer.style.zIndex = '9999';
                        alertContainer.style.minWidth = '300px';
                        alertContainer.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                        alertContainer.style.transform = 'translateX(100%)';
                        alertContainer.style.opacity = '0';
                        alertContainer.style.transition = 'all 0.3s ease';
                        
                        alertContainer.innerHTML = `
                            <div class="d-flex align-items-center">
                                <i class="bi bi-check-circle-fill me-2 text-success fs-4"></i>
                                <div>${message}</div>
                            </div>
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        `;
                        
                        document.body.appendChild(alertContainer);
                        
                        // Animate in
                        setTimeout(() => {
                            alertContainer.style.transform = 'translateX(0)';
                            alertContainer.style.opacity = '1';
                        }, 100);
                        
                        // Auto dismiss after 3 seconds
                        setTimeout(() => {
                            alertContainer.style.transform = 'translateX(100%)';
                            alertContainer.style.opacity = '0';
                            setTimeout(() => {
                                alertContainer.remove();
                            }, 300);
                        }, 3000);
                    }
                
                    // Show an alert with improved styling
                    function showAlert(message, type = 'info') {
                        const alertContainer = document.createElement('div');
                        alertContainer.className = `alert alert-${type} alert-dismissible fade show`;
                        alertContainer.role = 'alert';
                        alertContainer.style.position = 'fixed';
                        alertContainer.style.top = '20px';
                        alertContainer.style.right = '20px';
                        alertContainer.style.zIndex = '9999';
                        alertContainer.style.minWidth = '300px';
                        alertContainer.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                        alertContainer.style.transform = 'translateX(100%)';
                        alertContainer.style.opacity = '0';
                        alertContainer.style.transition = 'all 0.3s ease';
                        
                        // Icon based on alert type
                        let icon = 'info-circle-fill';
                        if (type === 'danger') icon = 'exclamation-triangle-fill';
                        else if (type === 'warning') icon = 'exclamation-circle-fill';
                        else if (type === 'success') icon = 'check-circle-fill';
                        
                        alertContainer.innerHTML = `
                            <div class="d-flex align-items-center">
                                <i class="bi bi-${icon} me-2 text-${type} fs-4"></i>
                                <div>${message}</div>
                            </div>
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        `;
                        
                        document.body.appendChild(alertContainer);
                        
                        // Animate in
                        setTimeout(() => {
                            alertContainer.style.transform = 'translateX(0)';
                            alertContainer.style.opacity = '1';
                        }, 100);
                        
                        // Auto dismiss after 5 seconds
                        setTimeout(() => {
                            alertContainer.style.transform = 'translateX(100%)';
                            alertContainer.style.opacity = '0';
                            setTimeout(() => {
                                alertContainer.remove();
                            }, 300);
                        }, 5000);
                    }
                    
                    function clearMessages() {
                        $chatMessages.html('<div class="system-message">Beginning of secure conversation</div>');
                    }
                    
                    function updateConnectionStatus() {
                        $.get('/status')
                            .done(function(data) {
                                if (data.connected) {
                                    $('#status-username').text(data.username);
                                    $('#status-server').text(data.server);
                                    $('#status-connection').removeClass('bg-danger').addClass('bg-success').text('Connected');
                                    
                                    if (!connected) {
                                        // Connection was established
                                        connected = true;
                                        $connectionPanel.addClass('d-none');
                                        $statusPanel.removeClass('d-none');
                                        $messageInput.prop('disabled', false);
                                        $sendBtn.prop('disabled', false);
                                        $fileBtn.prop('disabled', false);
                                        
                                        // Start polling for messages
                                        startMessagePolling();
                                        clearMessages();
                                        
                                        // Join the main room
                                        if (data.active_room) {
                                            activeRoom = data.active_room;
                                            updateActiveRoom();
                                        } else {
                                            joinRoom('main');
                                        }
                                    }
                                } else {
                                    if (connected) {
                                        // Connection was lost
                                        connected = false;
                                        $connectionPanel.removeClass('d-none');
                                        $statusPanel.addClass('d-none');
                                        $messageInput.prop('disabled', true);
                                        $sendBtn.prop('disabled', true);
                                        $fileBtn.prop('disabled', true);
                                        
                                        // Stop polling for messages
                                        stopMessagePolling();
                                        showError('Connection to server lost');
                                        
                                        // Show disconnected message
                                        $chatMessages.html('<div class="text-center text-muted my-5">' +
                                                           '<i class="bi bi-wifi-off fs-1"></i>' +
                                                           '<p>Disconnected from server</p></div>');
                                    }
                                }
                            })
                            .fail(function() {
                                // Unable to get status
                                if (connected) {
                                    connected = false;
                                    $connectionPanel.removeClass('d-none');
                                    $statusPanel.addClass('d-none');
                                    $messageInput.prop('disabled', true);
                                    $sendBtn.prop('disabled', true);
                                    $fileBtn.prop('disabled', true);
                                    
                                    // Stop polling for messages
                                    stopMessagePolling();
                                }
                            });
                    }
                    
                    function startMessagePolling() {
                        // Stop any existing polling
                        stopMessagePolling();
                        
                        // Start new polling interval
                        messagePollingInterval = setInterval(function() {
                            fetchMessages();
                            updateConnectionStatus();
                        }, 1000);
                    }
                    
                    function stopMessagePolling() {
                        if (messagePollingInterval) {
                            clearInterval(messagePollingInterval);
                            messagePollingInterval = null;
                        }
                    }
                
                    // Function to add technical details to the page
                    function updateTechnicalDetails() {
                        // Get the technical details section
                        const $protocolDetails = $('#protocol-details');
                        const $securityProperties = $('#security-properties');
                        
                        // Protocol details HTML
                        const protocolHtml = `
                            <div class="card mb-3">
                                <div class="card-header bg-primary text-white">
                                    Protocol Details
                                </div>
                                <div class="card-body">
                                    <div class="d-flex justify-content-between mb-2">
                                        <div>
                                            <strong>Handshake Pattern:</strong>
                                        </div>
                                        <div class="badge bg-primary">Noise XX</div>
                                    </div>
                                    <div class="d-flex justify-content-between mb-2">
                                        <div>
                                            <strong>Encryption:</strong>
                                        </div>
                                        <div class="badge bg-primary">ChaCha20-Poly1305</div>
                                    </div>
                                    <div class="d-flex justify-content-between mb-2">
                                        <div>
                                            <strong>Key Exchange:</strong>
                                        </div>
                                        <div class="badge bg-primary">X25519</div>
                                    </div>
                                    <div class="d-flex justify-content-between mb-2">
                                        <div>
                                            <strong>Hash Function:</strong>
                                        </div>
                                        <div class="badge bg-primary">SHA-256</div>
                                    </div>
                                </div>
                            </div>
                        `;
                        
                        // Security properties HTML
                        const securityHtml = `
                            <div class="card">
                                <div class="card-header bg-success text-white">
                                    Security Properties
                                </div>
                                <div class="card-body">
                                    <div class="d-flex justify-content-between mb-2">
                                        <div>
                                            <strong>Authentication:</strong>
                                        </div>
                                        <div class="badge bg-success">✓</div>
                                    </div>
                                    <div class="d-flex justify-content-between mb-2">
                                        <div>
                                            <strong>Perfect Forward Secrecy:</strong>
                                        </div>
                                        <div class="badge bg-success">✓</div>
                                    </div>
                                    <div class="d-flex justify-content-between mb-2">
                                        <div>
                                            <strong>Integrity (AEAD):</strong>
                                        </div>
                                        <div class="badge bg-success">✓</div>
                                    </div>
                                    <div class="d-flex justify-content-between mb-2">
                                        <div>
                                            <strong>Replay Protection:</strong>
                                        </div>
                                        <div class="badge bg-success">✓</div>
                                    </div>
                                </div>
                            </div>
                        `;
                        
                        // Update the HTML
                        $protocolDetails.html(protocolHtml);
                        $securityProperties.html(securityHtml);
                    }
                
                    // Improved fetchMessages function that prevents duplicate system messages
                    function fetchMessages() {
                        // Get the active room ID
                        const activeRoomName = $('#active-room').text().trim();
                        let roomFilter = '';
                        
                        // Use URL parameter if available
                        const urlParams = new URLSearchParams(window.location.search);
                        const roomParam = urlParams.get('room');
                        
                        if (roomParam) {
                            roomFilter = `?room=${roomParam}`;
                        } else if (activeRoomName !== 'Main Room') {
                            // Try to determine room ID from active room name
                            const rooms = Array.from(document.querySelectorAll('.room-item')).map(el => ({
                                name: el.querySelector('.fw-bold').textContent.trim(),
                                id: el.querySelector('[data-room-id]')?.getAttribute('data-room-id')
                            })).filter(r => r.id);
                            
                            const roomMatch = rooms.find(r => r.name === activeRoomName);
                            if (roomMatch) {
                                roomFilter = `?room=${roomMatch.id}`;
                            }
                        }
                        
                        $.get(`/messages${roomFilter}`)
                            .done(function(data) {
                                if (data.success) {
                                    // Process new messages
                                    if (data.messages && data.messages.length > 0) {
                                        // Clear messages area if this is the first batch
                                        if ($chatMessages.find('.message').length === 0 && $chatMessages.find('.system-message').length <= 1) {
                                            clearMessages();
                                        }
                                        
                                        // Get the already displayed messages for deduplication
                                        const displayedMessageContents = new Set();
                                        $chatMessages.find('.message .message-content').each(function() {
                                            displayedMessageContents.add($(this).text());
                                        });
                                        
                                        // Get system messages for deduplication
                                        const displayedSystemMessages = new Set();
                                        $chatMessages.find('.system-message').each(function() {
                                            displayedSystemMessages.add($(this).text());
                                        });
                                        
                                        // Process all messages with deduplication
                                        data.messages.forEach(message => {
                                            if (message.type === 'system') {
                                                // Only add if not already displayed
                                                if (!displayedSystemMessages.has(message.content)) {
                                                    addSystemMessage(message.content);
                                                    displayedSystemMessages.add(message.content);
                                                }
                                            } else {
                                                // For regular messages, check if we already have this exact content
                                                const isDuplicate = message.type === 'outgoing' && 
                                                                   displayedMessageContents.has(message.content);
                                                
                                                if (!isDuplicate) {
                                                    addMessageToChat(message);
                                                    displayedMessageContents.add(message.content);
                                                }
                                            }
                                        });
                                    }
                                    
                                    // Check connection status
                                    if (!data.connected && connected) {
                                        updateConnectionStatus();
                                    }
                                }
                            })
                            .fail(function() {
                                console.log("Failed to fetch messages");
                            });
                    }
                
                    // Add system message with animation
                    function addSystemMessage(message) {
                        // Check if this exact message already exists
                        let isDuplicate = false;
                        $chatMessages.find('.system-message').each(function() {
                            if ($(this).text() === message) {
                                isDuplicate = true;
                                return false; // Break the loop
                            }
                        });
                        
                        // Only add if not a duplicate
                        if (!isDuplicate) {
                            const messageHtml = `<div class="system-message">${message}</div>`;
                            $chatMessages.append(messageHtml);
                            $chatMessages.scrollTop($chatMessages[0].scrollHeight);
                        }
                    }
                    
                    // Add to your addMessageToChat function
                    function addMessageToChat(message) {
                        const isOutgoing = message.type === 'outgoing' || message.type === 'outgoing_file';
                        const isFile = message.type === 'file' || message.type === 'outgoing_file';
                        const timestamp = new Date(message.timestamp).toLocaleTimeString();
                        
                        // Get encryption/decryption metadata
                        const encryption = message.encryption || {};
                        
                        // Add room information if available and not in main room
                        const roomPrefix = message.room_id && message.room_id !== 'main' && message.room_name ? 
                                        `[${message.room_name}] ` : '';
                        
                        // First check if this message already exists to prevent duplication
                        let isDuplicate = false;
                        $chatMessages.find('.message').each(function() {
                            // For file messages, check the file URL
                            if (isFile && message.file_info) {
                                const fileUrl = $(this).find('.file-link').attr('href');
                                if (fileUrl === message.file_info.url) {
                                    isDuplicate = true;
                                    return false; // Break the loop
                                }
                            } else {
                                // For regular messages check content
                                const content = $(this).find('.message-content').text();
                                const sender = $(this).find('.message-sender').text();
                                const direction = $(this).hasClass('outgoing') ? 'outgoing' : 'incoming';
                                
                                if (content === message.content && 
                                    ((sender.includes(message.sender) || !sender) || !message.sender) && 
                                    direction === (isOutgoing ? 'outgoing' : 'incoming')) {
                                    isDuplicate = true;
                                    return false; // Break the loop
                                }
                            }
                        });
                        
                        // Only add if not a duplicate
                        if (!isDuplicate) {
                            let messageHtml = `
                                <div class="message ${isOutgoing ? 'outgoing' : 'incoming'}">
                                    <div class="message-bubble">
                                        ${!isOutgoing ? `<div class="message-sender">${roomPrefix}${message.sender || 'Unknown'}</div>` : ''}
                                        <div class="message-content">${escapeHtml(message.content)}</div>
                            `;
                            
                            // Add file attachment if this is a file message
                            if (isFile && message.file_info) {
                                const fileInfo = message.file_info;
                                const isImage = fileInfo.mime_type && fileInfo.mime_type.startsWith('image/');
                                const isVideo = fileInfo.mime_type && fileInfo.mime_type.startsWith('video/');
                                const isAudio = fileInfo.mime_type && fileInfo.mime_type.startsWith('audio/');
                                
                                // Get the most reliable URL for the file
                                const fileUrl = fileInfo.download_url || fileInfo.url || fileInfo.public_url || `/files/${fileInfo.stored_filename}`;
                                
                                messageHtml += `
                                    <div class="file-message mt-2">
                                        <div class="file-icon">
                                            <i class="bi ${isImage ? 'bi-image' : isVideo ? 'bi-file-earmark-play' : isAudio ? 'bi-file-earmark-music' : 'bi-file-earmark'}"></i>
                                        </div>
                                        <div class="file-info">
                                            <div class="file-name">${escapeHtml(fileInfo.filename)}</div>
                                            <div class="file-size">${formatFileSize(fileInfo.size)}</div>
                                            <div class="mt-2">
                                                <a href="${fileUrl}" class="btn btn-sm btn-primary file-link" 
                                                   download="${fileInfo.filename}" target="_blank">
                                                    <i class="bi bi-download"></i> Download
                                                </a>
                                                <button type="button" class="btn btn-sm btn-outline-secondary copy-file-link ms-2" 
                                                        data-url="${window.location.origin}${fileUrl}">
                                                    <i class="bi bi-link-45deg"></i> Copy Link
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `;
                                
                                // Add preview for images, videos and audio
                                if (isImage) {
                                    messageHtml += `
                                        <div class="file-preview mt-2">
                                            <img src="${fileUrl}" class="img-fluid rounded" alt="${fileInfo.filename}" style="max-height: 200px; max-width: 100%;">
                                        </div>
                                    `;
                                } else if (isVideo) {
                                    messageHtml += `
                                        <div class="file-preview mt-2">
                                            <video controls class="img-fluid rounded" style="max-height: 200px; max-width: 100%;">
                                                <source src="${fileUrl}" type="${fileInfo.mime_type}">
                                                Your browser does not support the video tag.
                                            </video>
                                        </div>
                                    `;
                                } else if (isAudio) {
                                    messageHtml += `
                                        <div class="file-preview mt-2">
                                            <audio controls class="w-100">
                                                <source src="${fileUrl}" type="${fileInfo.mime_type}">
                                                Your browser does not support the audio tag.
                                            </audio>
                                        </div>
                                    `;
                                }
                            }
                            
                            // Add technical details button
                            messageHtml += `
                                        <button class="btn btn-sm btn-outline-primary mt-2 technical-details-btn" type="button">
                                            Technical Details
                                        </button>
                                        
                                        <div class="technical-details-panel mt-2" style="display: none;">
                                            <div class="card">
                                                <div class="card-body p-3 bg-light">
                                                    <!-- Message Information -->
                                                    <div class="mb-3 pb-2 border-bottom">
                                                        <div class="text-primary fw-bold">Message Information</div>
                                                        ${message.room_id && message.room_id !== 'main' ? 
                                                        `<div><span class="fw-bold">Room:</span> ${message.room_name || message.room_id}</div>` : ''}
                                                        <div><span class="fw-bold">Content:</span> "${message.content}"</div>
                                                        <div><span class="fw-bold">Direction:</span> ${isOutgoing ? 'Outgoing' : 'Incoming'}</div>
                                                        <div><span class="fw-bold">Time:</span> ${timestamp}</div>
                                                        ${isFile ? `<div><span class="fw-bold">File:</span> ${message.file_info.filename} (${formatFileSize(message.file_info.size)})</div>` : ''}
                                                    </div>
                                                    
                                                    <!-- Encryption Details -->
                                                    <div class="mb-3 pb-2 border-bottom">
                                                        <div class="text-success fw-bold">Encryption Details</div>
                                                        <div><span class="fw-bold">Key ID:</span> <span class="mono">${encryption.key_id || (isFile ? `file-key-${message.file_info.stored_filename?.split('_')[0] || 'unknown'}` : 'N/A')}</span></div>
                                                        <div><span class="fw-bold">Encrypted Bytes:</span></div>
                                                        <div class="encrypted-bytes mono">${encryption.encrypted_hex || (isFile ? '(file data encrypted, first 64 bytes)' : 'Not available')}</div>
                                                        <button class="btn btn-sm btn-outline-secondary mt-1 show-full-bytes">
                                                            Show Full
                                                        </button>
                                                        <div class="full-bytes mono mt-2" style="display: none;">
                                                            ${encryption.full_encrypted_hex || (isFile ? '(Full encrypted file data - MD5: ' + (message.file_info.md5 || 'not available') + ')' : 'Not available')}
                                                        </div>
                                                        <div><span class="fw-bold">Size Before:</span> ${encryption.original_size || (isFile ? message.file_info.size : 'N/A')} bytes</div>
                                                        <div><span class="fw-bold">Size After:</span> ${encryption.encrypted_size || (isFile ? message.file_info.size : 'N/A')} bytes</div>
                                                        <div><span class="fw-bold">Encryption Ratio:</span> ${encryption.original_size ? (encryption.encrypted_size / encryption.original_size).toFixed(2) + 'x' : '1.00x'}</div>
                                                        <div><span class="fw-bold">Nonce:</span> <span class="mono">${encryption.nonce || (isFile ? 'Generated for file encryption' : 'N/A')}</span></div>
                                                        <div><span class="fw-bold">Timestamp:</span> ${encryption.timestamp || timestamp}</div>
                                                    </div>
                                                    
                                                    <!-- Protocol Information -->
                                                    <div>
                                                        <div class="text-info fw-bold">Protocol Information</div>
                                                        <div><span class="fw-bold">Algorithm:</span> ${encryption.algorithm || 'ChaCha20-Poly1305'}</div>
                                                        <div><span class="fw-bold">Pattern:</span> Noise XX</div>
                                                        <div><span class="fw-bold">Key Exchange:</span> X25519</div>
                                                        ${isFile ? `<div><span class="fw-bold">Transfer Security:</span> End-to-end encrypted file transfer</div>` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="message-time">${timestamp}</div>
                                </div>
                            `;
                            
                            $chatMessages.append(messageHtml);
                            $chatMessages.scrollTop($chatMessages[0].scrollHeight);
                            
                            // Add event listeners for technical details buttons
                            $chatMessages.find('.technical-details-btn').last().on('click', function() {
                                $(this).next('.technical-details-panel').slideToggle();
                            });
                            
                            // Add event listeners for show full/less buttons
                            $chatMessages.find('.show-full-bytes').last().on('click', function() {
                                const $button = $(this);
                                const $fullBytes = $button.next('.full-bytes');
                                
                                if ($fullBytes.is(':visible')) {
                                    $fullBytes.hide();
                                    $button.text('Show Full');
                                } else {
                                    $fullBytes.show();
                                    $button.text('Show Less');
                                }
                            });
                            
                            // Add event listener for copy file link button
                            $chatMessages.find('.copy-file-link').last().on('click', function() {
                                const fileUrl = $(this).data('url');
                                if (fileUrl) {
                                    // Create temporary input for copying
                                    const tempInput = document.createElement('input');
                                    document.body.appendChild(tempInput);
                                    tempInput.value = fileUrl;
                                    tempInput.select();
                                    
                                    // Copy text and show feedback
                                    try {
                                        document.execCommand('copy');
                                        // Change button text to show success
                                        const originalText = $(this).html();
                                        $(this).html('<i class="bi bi-check-circle"></i> Copied!');
                                        
                                        // Reset button after 2 seconds
                                        setTimeout(() => {
                                            $(this).html(originalText);
                                        }, 2000);
                                    } catch (err) {
                                        console.error('Could not copy text: ', err);
                                    }
                                    
                                    // Remove temp element
                                    document.body.removeChild(tempInput);
                                }
                            });
                        }
                    }
                    
                    function escapeHtml(text) {
                        if (!text) return '';
                        return text.toString()
                            .replace(/&/g, "&amp;")
                            .replace(/</g, "&lt;")
                            .replace(/>/g, "&gt;")
                            .replace(/"/g, "&quot;")
                            .replace(/'/g, "&#039;");
                    }
                    
                    // Enhanced sendMessage function with room support
                    function sendMessage() {
                        const message = $('#message-input').val().trim();
                        if (!message) return;
                        
                        // Clear input immediately
                        $('#message-input').val('');
                        
                        // Get the active room from UI
                        const activeRoomElement = document.getElementById('active-room');
                        const activeRoomName = activeRoomElement ? activeRoomElement.textContent.trim() : 'Main Room';
                        
                        // Determine the room ID to use
                        let roomId;
                        
                        // First check if we have a URL parameter for room
                        const urlParams = new URLSearchParams(window.location.search);
                        const roomParam = urlParams.get('room');
                        
                        if (roomParam) {
                            roomId = roomParam;
                        } else if (activeRoomName === 'Main Room') {
                            roomId = 'main';
                        } else {
                            // Try to find the room ID from room list
                            const rooms = Array.from(document.querySelectorAll('.room-item')).map(el => ({
                                name: el.querySelector('.fw-bold').textContent.trim(),
                                id: el.querySelector('[data-room-id]')?.getAttribute('data-room-id')
                            })).filter(r => r.id);
                            
                            const roomMatch = rooms.find(r => r.name === activeRoomName);
                            if (roomMatch) {
                                roomId = roomMatch.id;
                            } else {
                                roomId = 'main'; // Fallback to main room
                            }
                        }
                        
                        $.ajax({
                            url: '/send',
                            type: 'POST',
                            contentType: 'application/json',
                            data: JSON.stringify({
                                message: message,
                                room_id: roomId
                            }),
                            success: function(response) {
                                if (!response.success) {
                                    showAlert(response.message || 'Failed to send message', 'danger');
                                    // Return the message to the input box
                                    $('#message-input').val(message);
                                }
                            },
                            error: function() {
                                showAlert('Failed to send message', 'danger');
                                $('#message-input').val(message);
                            }
                        });
                    }
                    
                    // Event listeners
                    $connectForm.on('submit', function(e) {
                        e.preventDefault();
                        
                        const username = $('#username').val().trim();
                        const server = $('#server').val().trim() || window.location.hostname;
                        const port = parseInt($('#port').val().trim());
                        
                        if (!username) {
                            showError('Please enter a username');
                            return;
                        }
                        
                        if (!server) {
                            showError('Please enter a server address');
                            return;
                        }
                        
                        if (isNaN(port) || port <= 0 || port > 65535) {
                            showError('Please enter a valid port number');
                            return;
                        }
                        
                        // Send connection request
                        $.ajax({
                            url: '/connect',
                            type: 'POST',
                            contentType: 'application/json',
                            data: JSON.stringify({
                                username: username,
                                server: server,
                                port: port
                            }),
                            success: function(response) {
                                if (response.success) {
                                    // Connection successful
                                    updateConnectionStatus();
                                } else {
                                    // Connection failed
                                    showError(response.message || 'Failed to connect to server');
                                }
                            },
                            error: function() {
                                showError('Failed to connect to server');

                            }
                        });
                    });
                    
                    $disconnectBtn.on('click', function() {
                        $.post('/disconnect')
                            .done(function(response) {
                                if (response.success) {
                                    updateConnectionStatus();
                                } else {
                                    showError(response.message || 'Failed to disconnect');
                                }
                            })
                            .fail(function() {
                                showError('Failed to disconnect');
                            });
                    });
                    
                    $messageForm.on('submit', function(e) {
                        e.preventDefault();
                        sendMessage();
                    });
                    
                    // Modify your existing file upload handler
                $fileBtn.on('click', function() {
                    // Set the active room ID as a data attribute
                    const activeRoomName = $('#active-room').text().trim();
                    const urlParams = new URLSearchParams(window.location.search);
                    const roomParam = urlParams.get('room');
                    const roomId = roomParam || (activeRoomName === 'Main Room' ? 'main' : activeRoomName);
                    
                    $('#fileUploadRoomId').val(roomId);
                    fileModal.show();
                });

                $('#upload-file-btn').on('click', function() {
                    // Update status message
                    $('#uploadStatusMessage').text('Preparing file for upload...');
                    
                    // Validate file selection
                    const fileInput = document.getElementById('fileInput');
                    if (!fileInput.files || fileInput.files.length === 0) {
                        $('#uploadStatusMessage').text('Please select a file first');
                        showAlert('Please select a file', 'warning');
                        return;
                    }
                    
                    const file = fileInput.files[0];
                    const roomId = $('#fileUploadRoomId').val() || 'main';
                    
                    // Validate file extension
                    const fileExt = file.name.split('.').pop().toLowerCase();
                    const allowedExts = ['txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xls', 'xlsx', 'mp4', 'mp3', 'zip', 'rar', '7z'];
                    
                    if (!fileExt || !allowedExts.includes(fileExt)) {
                        $('#uploadStatusMessage').text(`File type .${fileExt} is not allowed`);
                        showAlert(`File type .${fileExt} is not allowed. Allowed types: ${allowedExts.join(', ')}`, 'danger');
                        return;
                    }
                    
                    // Check file size (max 50MB)
                    if (file.size > 50 * 1024 * 1024) {
                        $('#uploadStatusMessage').text('File too large (max 50MB)');
                        showAlert('File too large. Maximum size is 50MB', 'danger');
                        return;
                    }
                    
                    // Log file information for debugging
                    console.log(`Uploading file: ${file.name}, type: ${file.type}, size: ${file.size} bytes, to room: ${roomId}`);
                    $('#uploadStatusMessage').text(`Uploading ${file.name} (${formatFileSize(file.size)})...`);
                    
                    // Show upload progress
                    const $uploadBtn = $(this);
                    $uploadBtn.prop('disabled', true);
                    $uploadBtn.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...');
                    
                    // Reset progress bar
                    $('#fileUploadProgress').css('width', '0%').attr('aria-valuenow', 0).text('0%');
                    
                    // Create form data
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('room_id', roomId);
                    
                    // Upload file
                    $.ajax({
                        url: '/upload',
                        type: 'POST',
                        data: formData,
                        processData: false,
                        contentType: false,
                        xhr: function() {
                            const xhr = new window.XMLHttpRequest();
                            xhr.upload.addEventListener('progress', function(e) {
                                if (e.lengthComputable) {
                                    const percent = Math.round((e.loaded / e.total) * 100);
                                    console.log(`Upload progress: ${percent}%`);
                                    $('#fileUploadProgress').css('width', percent + '%').attr('aria-valuenow', percent).text(percent + '%');
                                    $('#uploadStatusMessage').text(`Uploading: ${percent}% complete...`);
                                }
                            }, false);
                            return xhr;
                        },
                        success: function(response) {
                            console.log('Upload response:', response);
                            
                            // Reset UI elements
                            $uploadBtn.prop('disabled', false);
                            $uploadBtn.html('Send File');
                            
                            if (response.success) {
                                $('#uploadStatusMessage').text('File uploaded successfully!');
                                $('#fileUploadProgress').removeClass('progress-bar-animated').addClass('bg-success');
                                
                                // Keep success state visible briefly before resetting
                                setTimeout(() => {
                                    // Close modal
                                    fileModal.hide();
                                    
                                    // Clear file input
                                    fileInput.value = '';
                                    
                                    // Reset progress bar
                                    $('#fileUploadProgress').css('width', '0%').attr('aria-valuenow', 0).text('');
                                    $('#fileUploadProgress').addClass('progress-bar-animated').removeClass('bg-success');
                                    
                                    // Reset status message
                                    $('#uploadStatusMessage').text('Select a file and click "Send File" to upload.');
                                }, 1500);
                                
                                // Success message
                                showSuccess(`File '${file.name}' sent (${formatFileSize(file.size)})`);
                            } else {
                                $('#uploadStatusMessage').text(response.message || 'Upload failed');
                                $('#fileUploadProgress').css('width', '0%').attr('aria-valuenow', 0).text('');
                                showAlert(response.message || 'Failed to upload file', 'danger');
                            }
                        },
                        error: function(xhr, status, error) {
                            console.error('Upload error:', status, error);
                            console.log('Response text:', xhr.responseText);
                            
                            // Reset UI elements
                            $uploadBtn.prop('disabled', false);
                            $uploadBtn.html('Send File');
                            $('#fileUploadProgress').css('width', '0%').attr('aria-valuenow', 0).text('');
                            
                            // Try to parse error message if possible
                            let errorMsg = 'Failed to upload file';
                            try {
                                const response = JSON.parse(xhr.responseText);
                                if (response && response.message) {
                                    errorMsg = response.message;
                                }
                            } catch (e) {
                                // If parsing fails, use generic error with status
                                errorMsg = `Upload failed: ${status} ${error}`;
                            }
                            
                            $('#uploadStatusMessage').text(errorMsg);
                            showAlert(errorMsg, 'danger');
                        }
                    });
                });
                    
                    // Refresh room list when room modal is opened
                    $('#roomListModal').on('shown.bs.modal', function() {
                        refreshRoomList();
                    });
                    
                    // Create room form submission
                    $('#create-room-form').on('submit', function(e) {
                        e.preventDefault();
                        createRoom();
                    });
                    
                    // Handle direct click on create room button
                    $('#create-room-btn').on('click', function() {
                        createRoom();
                    });
                    
                    // Handle refresh button click
                    $('#refresh-rooms-btn').on('click', function() {
                        refreshRoomList();
                    });
                    
                    function formatFileSize(bytes) {
                        if (bytes < 1024) return bytes + ' B';
                        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
                        else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
                        else return (bytes / 1073741824).toFixed(1) + ' GB';
                    }
                    
                    // Add CSS for room members
                    const style = document.createElement('style');
                    style.textContent = `
                        .room-members {
                            max-height: 150px;
                            overflow-y: auto;
                        }
                        
                        .room-members-list li {
                            padding: 2px 0;
                        }
                        
                        .system-message {
                            text-align: center;
                            margin: 1rem 0;
                            color: #6c757d;
                            font-style: italic;
                        }
                    `;
                    document.head.appendChild(style);
                    
                    // Initialize application
                    updateConnectionStatus();
                    updateTechnicalDetails();
                    
                    // Check for room parameter in URL on page load
                    const urlParams = new URLSearchParams(window.location.search);
                    const roomParam = urlParams.get('room');
                    if (roomParam && connected) {
                        joinRoom(roomParam);
                    }
                    
                    // Register event listener for popstate (browser back/forward buttons)
                    window.addEventListener('popstate', function(e) {
                        const urlParams = new URLSearchParams(window.location.search);
                        const roomParam = urlParams.get('room');
                        if (roomParam && connected) {
                            joinRoom(roomParam);
                        } else if (connected) {
                            joinRoom('main');
                        }
                    });
                    
                    // Functions for handling sidebar features
                    
                    // Group Chat Functions
                    function refreshRoomListInModal() {
                        const roomList = $('#roomListInModal');
                        roomList.html('<div class="text-center py-3"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Loading rooms...</p></div>');
                        
                        $.get('/rooms')
                            .done(function(data) {
                                if (data.success) {
                                    renderRoomListInModal(data.rooms || []);
                                } else {
                                    roomList.html(`<div class="alert alert-danger">Failed to load rooms: ${data.message || 'Unknown error'}</div>`);
                                }
                            })
                            .fail(function(error) {
                                console.error('Error fetching rooms:', error);
                                roomList.html(`<div class="alert alert-danger">Error loading rooms</div>`);
                            });
                    }
                    
                    function renderRoomListInModal(rooms) {
                        const roomList = $('#roomListInModal');
                        
                        if (!rooms || rooms.length === 0) {
                            roomList.html('<div class="text-center text-muted">No rooms available</div>');
                            return;
                        }
                        
                        const activeRoomName = $('#active-room').text().trim();
                        
                        let html = '<div class="list-group">';
                        
                        rooms.forEach(room => {
                            const isActive = room.name === activeRoomName || 
                                            (activeRoomName === 'Main Room' && room.id === 'main');
                            
                            const buttonClass = isActive ? 'btn-danger' : 'btn-primary';
                            const buttonText = isActive ? 'Leave' : 'Join';
                            const actionClass = isActive ? 'leave-room-btn-modal' : 'join-room-btn-modal';
                            
                            html += `
                                <div class="list-group-item">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div>
                                            <h5 class="mb-1">${escapeHtml(room.name)}</h5>
                                            <p class="mb-1 small text-muted">ID: ${escapeHtml(room.id)}</p>
                                            ${room.description ? `<p class="mb-1 small">${escapeHtml(room.description)}</p>` : ''}
                                            <small><i class="bi bi-people-fill me-1"></i>${room.member_count || 0} members</small>
                                        </div>
                                        <div>
                                            <button class="btn ${buttonClass} ${actionClass}" data-room-id="${escapeHtml(room.id)}">
                                                ${buttonText}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `;
                        });
                        
                        html += '</div>';
                        roomList.html(html);
                        
                        // Add event listeners for room action buttons
                        roomList.find('.join-room-btn-modal').on('click', function() {
                            const roomId = $(this).data('room-id');
                            joinRoom(roomId);
                            // Update the active tab to show member information
                            $('#active-tab').tab('show');
                            loadCurrentRoomInfo();
                        });
                        
                        roomList.find('.leave-room-btn-modal').on('click', function() {
                            const roomId = $(this).data('room-id');
                            leaveRoom(roomId);
                            // Refresh the room list after leaving
                            setTimeout(refreshRoomListInModal, 1000);
                        });
                    }
                    
                    function loadCurrentRoomInfo() {
                        const currentRoomInfo = $('#currentRoomInfo');
                        const roomMembersList = $('#roomMembersList');
                        
                        currentRoomInfo.html('<div class="text-center py-3"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Loading room information...</p></div>');
                        roomMembersList.html('<li class="list-group-item text-center"><div class="spinner-border spinner-border-sm text-primary" role="status"></div><span class="ms-2">Loading members...</span></li>');
                        
                        // Get the active room name
                        const activeRoomName = $('#active-room').text().trim();
                        
                        // Determine room ID
                        let roomId;
                        if (activeRoomName === 'Main Room') {
                            roomId = 'main';
                        } else {
                            // Try to find room ID from URL
                            const urlParams = new URLSearchParams(window.location.search);
                            roomId = urlParams.get('room') || 'main';
                        }
                        
                        // Fetch room info
                        $.get(`/room_info/${roomId}`)
                            .done(function(data) {
                                if (data.success) {
                                    // Update room information
                                    const room = data.room;
                                    
                                    currentRoomInfo.html(`
                                        <div class="card">
                                            <div class="card-header">
                                                <i class="bi bi-chat-square-text-fill me-1"></i>Room Information
                                            </div>
                                            <div class="card-body">
                                                <h5 class="card-title">${escapeHtml(room.name)}</h5>
                                                <h6 class="card-subtitle mb-2 text-muted">ID: ${escapeHtml(room.id)}</h6>
                                                ${room.description ? `<p class="card-text">${escapeHtml(room.description)}</p>` : ''}
                                                <p class="mb-1"><i class="bi bi-people-fill me-1"></i>Members: ${room.member_count}</p>
                                                <div class="d-grid mt-3">
                                                    <button class="btn ${room.id === 'main' ? 'btn-secondary disabled' : 'btn-outline-danger'} leave-current-room-btn"
                                                        ${room.id === 'main' ? 'disabled' : ''} data-room-id="${escapeHtml(room.id)}">
                                                        <i class="bi bi-box-arrow-left me-1"></i>Leave Room
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    `);
                                    
                                    // Update member list
                                    if (room.members && room.members.length > 0) {
                                        let membersHtml = '';
                                        room.members.forEach(member => {
                                            membersHtml += `
                                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <i class="bi bi-person-fill me-2"></i>
                                                        <span class="${member.is_current_user ? 'fw-bold' : ''}">${escapeHtml(member.username)}</span>
                                                    </div>
                                                    ${member.is_current_user ? '<span class="badge bg-primary">You</span>' : ''}
                                                </li>
                                            `;
                                        });
                                        roomMembersList.html(membersHtml);
                                    } else {
                                        roomMembersList.html('<li class="list-group-item text-center text-muted">No members in this room</li>');
                                    }
                                    
                                    // Add event listener to leave button
                                    $('.leave-current-room-btn').on('click', function() {
                                        const roomId = $(this).data('room-id');
                                        if (roomId !== 'main') {
                                            leaveRoom(roomId);
                                            // Switch to rooms tab after leaving
                                            $('#rooms-tab').tab('show');
                                            // Refresh room list
                                            setTimeout(refreshRoomListInModal, 500);
                                        }
                                    });
                                } else {
                                    currentRoomInfo.html(`<div class="alert alert-danger">Failed to load room information: ${data.message || 'Unknown error'}</div>`);
                                    roomMembersList.html('<li class="list-group-item text-center text-danger">Failed to load members</li>');
                                }
                            })
                            .fail(function(error) {
                                console.error('Error fetching room info:', error);
                                currentRoomInfo.html(`<div class="alert alert-danger">Error loading room information</div>`);
                                roomMembersList.html('<li class="list-group-item text-center text-danger">Error loading members</li>');
                            });
                    }
                    
                    $('#refreshRoomsInModalBtn').on('click', function() {
                        refreshRoomListInModal();
                    });
                    
                    $('#create-room-form-in-modal').on('submit', function(e) {
                        e.preventDefault();
                        
                        const roomId = $('#new-room-id-in-modal').val().trim();
                        const roomName = $('#new-room-name-in-modal').val().trim();
                        const description = $('#new-room-description-in-modal').val().trim();
                        
                        if (!roomId || !roomName) {
                            showAlert('Room ID and name are required', 'warning');
                            return;
                        }
                        
                        // Show loading state
                        const createButton = $('#create-room-btn-in-modal');
                        const originalButtonText = createButton.html();
                        createButton.prop('disabled', true);
                        createButton.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating...');
                        
                        $.ajax({
                            url: '/create_room',
                            type: 'POST',
                            contentType: 'application/json',
                            data: JSON.stringify({
                                room_id: roomId,
                                room_name: roomName,
                                description: description
                            }),
                            success: function(response) {
                                // Reset button
                                createButton.prop('disabled', false);
                                createButton.html(originalButtonText);
                                
                                if (response.success) {
                                    // Show success message
                                    showSuccess(`Room "${roomName}" created successfully`);
                                    
                                    // Clear form
                                    $('#new-room-id-in-modal').val('');
                                    $('#new-room-name-in-modal').val('');
                                    $('#new-room-description-in-modal').val('');
                                    
                                    // Switch to rooms tab to see the new room
                                    $('#rooms-tab').tab('show');
                                    
                                    // Refresh room list
                                    refreshRoomListInModal();
                                    
                                    // Join the newly created room
                                    joinRoom(roomId);
                                } else {
                                    showAlert(response.message || 'Failed to create room', 'danger');
                                }
                            },
                            error: function() {
                                // Reset button
                                createButton.prop('disabled', false);
                                createButton.html(originalButtonText);
                                
                                showAlert('Network error, please try again', 'danger');
                            }
                        });
                    });
                    
                    // File Transfer Functions
                    function updateFileTransferRooms() {
                        // Populate room dropdown in file transfer modal
                        const roomSelect = $('#fileDestinationRoom');
                        
                        $.get('/rooms')
                            .done(function(data) {
                                if (data.success) {
                                    roomSelect.empty();
                                    roomSelect.append('<option value="main">Main Room</option>');
                                    
                                    if (data.rooms && data.rooms.length > 0) {
                                        data.rooms.forEach(room => {
                                            if (room.id !== 'main') {
                                                roomSelect.append(`<option value="${escapeHtml(room.id)}">${escapeHtml(room.name)}</option>`);
                                            }
                                        });
                                    }
                                    
                                    // Set current active room as selected
                                    const activeRoomName = $('#active-room').text().trim();
                                    if (activeRoomName !== 'Main Room') {
                                        // Find matching room ID
                                        const matchingRoom = data.rooms.find(r => r.name === activeRoomName);
                                        if (matchingRoom) {
                                            roomSelect.val(matchingRoom.id);
                                        }
                                    }
                                }
                            });
                            
                        // Also update room filter in received files tab
                        const roomFilter = $('#fileRoomFilter');
                        roomFilter.empty();
                        roomFilter.append('<option value="all">All Rooms</option>');
                        roomFilter.append('<option value="main">Main Room</option>');
                        
                        $.get('/rooms')
                            .done(function(data) {
                                if (data.success && data.rooms) {
                                    data.rooms.forEach(room => {
                                        if (room.id !== 'main') {
                                            roomFilter.append(`<option value="${escapeHtml(room.id)}">${escapeHtml(room.name)}</option>`);
                                        }
                                    });
                                }
                            });
                    }
                    
                    function loadReceivedFiles(roomFilter = 'all') {
                        const filesList = $('#receivedFilesList');
                        filesList.html('<tr><td colspan="5" class="text-center"><div class="spinner-border spinner-border-sm text-primary"></div> Loading files...</td></tr>');
                        
                        $.get(`/received_files?room=${roomFilter}`)
                            .done(function(data) {
                                if (data.success) {
                                    if (data.files && data.files.length > 0) {
                                        let html = '';
                                        data.files.forEach(file => {
                                            const fileInfo = file.file_info;
                                            const fileUrl = fileInfo.download_url || fileInfo.url || `/files/${fileInfo.stored_filename}`;
                                            const timestamp = new Date(file.timestamp).toLocaleString();
                                            const fileSize = formatFileSize(fileInfo.size);
                                            
                                            html += `
                                                <tr>
                                                    <td>
                                                        <i class="bi ${fileInfo.mime_type && fileInfo.mime_type.startsWith('image/') ? 'bi-file-image' : 
                                                                    fileInfo.mime_type && fileInfo.mime_type.startsWith('video/') ? 'bi-file-play' : 
                                                                    fileInfo.mime_type && fileInfo.mime_type.startsWith('audio/') ? 'bi-file-music' : 
                                                                    'bi-file-earmark'} me-2"></i>
                                                        ${escapeHtml(fileInfo.filename)}
                                                    </td>
                                                    <td>${escapeHtml(file.sender)}</td>
                                                    <td>${fileSize}</td>
                                                    <td>${timestamp}</td>
                                                    <td>
                                                        <div class="btn-group btn-group-sm">
                                                            <a href="${fileUrl}" class="btn btn-primary" download="${fileInfo.filename}" target="_blank">
                                                                <i class="bi bi-download"></i>
                                                            </a>
                                                            <button type="button" class="btn btn-outline-secondary copy-file-link-modal" 
                                                                    data-url="${window.location.origin}${fileUrl}">
                                                                <i class="bi bi-link-45deg"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            `;
                                        });
                                        filesList.html(html);
                                        
                                        // Add event listeners for copy buttons
                                        $('.copy-file-link-modal').on('click', function() {
                                            const url = $(this).data('url');
                                            navigator.clipboard.writeText(url).then(() => {
                                                const button = $(this);
                                                const originalHtml = button.html();
                                                button.html('<i class="bi bi-check"></i>');
                                                setTimeout(() => {
                                                    button.html(originalHtml);
                                                }, 2000);
                                            });
                                        });
                                    } else {
                                        filesList.html('<tr><td colspan="5" class="text-center text-muted">No files received yet</td></tr>');
                                    }
                                } else {
                                    filesList.html(`<tr><td colspan="5" class="text-center text-danger">Failed to load files: ${data.message || 'Unknown error'}</td></tr>`);
                                }
                            })
                            .fail(function(error) {
                                console.error('Error fetching files:', error);
                                filesList.html('<tr><td colspan="5" class="text-center text-danger">Error loading files</td></tr>');
                            });
                    }
                    
                    // Handle file room filter change
                    $('#fileRoomFilter').on('change', function() {
                        const roomFilter = $(this).val();
                        loadReceivedFiles(roomFilter);
                    });
                    
                    // Enhanced file upload in modal
                    $('#enhanced-upload-file-btn').on('click', function() {
                        const fileInput = document.getElementById('enhancedFileInput');
                        const statusMessage = $('#enhancedUploadStatusMessage');
                        const progressBar = $('#enhancedFileUploadProgress');
                        
                        if (!fileInput.files || fileInput.files.length === 0) {
                            statusMessage.removeClass('alert-primary').addClass('alert-warning').text('Please select a file first');
                            return;
                        }
                        
                        const file = fileInput.files[0];
                        const roomId = $('#fileDestinationRoom').val() || 'main';
                        
                        // Show progress
                        statusMessage.removeClass('alert-warning').addClass('alert-primary').text(`Preparing to upload ${file.name}...`);
                        progressBar.css('width', '0%').attr('aria-valuenow', 0).text('0%');
                        
                        // Disable button during upload
                        const $uploadBtn = $(this);
                        $uploadBtn.prop('disabled', true);
                        $uploadBtn.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...');
                        
                        // Create form data
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('room_id', roomId);
                        
                        // Upload file
                        $.ajax({
                            url: '/upload',
                            type: 'POST',
                            data: formData,
                            processData: false,
                            contentType: false,
                            xhr: function() {
                                const xhr = new window.XMLHttpRequest();
                                xhr.upload.addEventListener('progress', function(e) {
                                    if (e.lengthComputable) {
                                        const percent = Math.round((e.loaded / e.total) * 100);
                                        progressBar.css('width', percent + '%').attr('aria-valuenow', percent).text(percent + '%');
                                        statusMessage.text(`Uploading: ${percent}% complete...`);
                                    }
                                }, false);
                                return xhr;
                            },
                            success: function(response) {
                                // Reset button
                                $uploadBtn.prop('disabled', false);
                                $uploadBtn.html('<i class="bi bi-file-earmark-arrow-up me-1"></i>Send File');
                                
                                if (response.success) {
                                    // Show success
                                    statusMessage.removeClass('alert-primary').addClass('alert-success').text('File uploaded successfully!');
                                    progressBar.addClass('bg-success');
                                    
                                    // Reset after delay
                                    setTimeout(() => {
                                        // Clear file input
                                        fileInput.value = '';
                                        
                                        // Reset progress
                                        progressBar.removeClass('bg-success').css('width', '0%').attr('aria-valuenow', 0).text('');
                                        
                                        // Reset status
                                        statusMessage.removeClass('alert-success').addClass('alert-primary').text('Select a file and click "Send File" to upload');
                                        
                                        // Refresh received files
                                        loadReceivedFiles();
                                        
                                        // Switch to received files tab
                                        $('#received-files-tab').tab('show');
                                    }, 2000);
                                    
                                    showSuccess(`File '${file.name}' sent to room`);
                                } else {
                                    statusMessage.removeClass('alert-primary').addClass('alert-danger').text(response.message || 'Upload failed');
                                    progressBar.css('width', '0%');
                                }
                            },
                            error: function(xhr) {
                                // Reset button
                                $uploadBtn.prop('disabled', false);
                                $uploadBtn.html('<i class="bi bi-file-earmark-arrow-up me-1"></i>Send File');
                                
                                // Show error
                                let errorMsg = 'Upload failed';
                                try {
                                    const response = JSON.parse(xhr.responseText);
                                    if (response && response.message) {
                                        errorMsg = response.message;
                                    }
                                } catch (e) {
                                    errorMsg = `Upload failed: ${xhr.status} ${xhr.statusText}`;
                                }
                                
                                statusMessage.removeClass('alert-primary').addClass('alert-danger').text(errorMsg);
                                progressBar.css('width', '0%');
                                showAlert(errorMsg, 'danger');
                            }
                        });
                    });
                    
                    // Security Report Functions
                    function runSecurityTests() {
                        const securityReport = $('#securityReport');
                        const progressBar = $('#securityTestProgress');
                        
                        // Check if user is connected
                        if (!connected) {
                            securityReport.html(`
                                <div class="alert alert-warning">
                                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                                    Please connect to a server before running security tests
                                </div>
                            `);
                            return;
                        }
                        
                        // Show loading state
                        securityReport.html(`
                            <div class="text-center py-5">
                                <div class="spinner-border text-primary" role="status"></div>
                                <p class="mt-3">Running security tests...</p>
                                <div class="progress mt-3">
                                    <div id="securityTestProgress" class="progress-bar progress-bar-striped progress-bar-animated" 
                                        style="width: 0%"></div>
                                </div>
                            </div>
                        `);
                        
                        // Start the security test
                        $.ajax({
                            url: '/security_test',
                            type: 'POST',
                            contentType: 'application/json',
                            data: JSON.stringify({
                                test: 'all'
                            }),
                            success: function(response) {
                                if (response.success) {
                                    // Start polling for results
                                    if (securityTestInterval) {
                                        clearInterval(securityTestInterval);
                                    }
                                    
                                    let progress = 0;
                                    securityTestInterval = setInterval(() => {
                                        // Update progress bar (simulate progress)
                                        if (progress < 100) {
                                            progress += 5;
                                            $('#securityTestProgress').css('width', progress + '%');
                                        }
                                        
                                        // Check status
                                        $.get('/security_test_status')
                                            .done(function(statusData) {
                                                if (statusData.status === 'completed' || progress >= 100) {
                                                    // Tests completed
                                                    clearInterval(securityTestInterval);
                                                    displaySecurityResults(statusData.results);
                                                }
                                            });
                                    }, 500);
                                } else {
                                    securityReport.html(`
                                        <div class="alert alert-danger">
                                            <i class="bi bi-x-circle-fill me-2"></i>
                                            Failed to start security tests: ${response.message || 'Unknown error'}
                                        </div>
                                    `);
                                }
                            },
                            error: function() {
                                securityReport.html(`
                                    <div class="alert alert-danger">
                                        <i class="bi bi-x-circle-fill me-2"></i>
                                        Network error when starting security tests
                                    </div>
                                `);
                            }
                        });
                    }
                    
                    function displaySecurityResults(results) {
                        const securityReport = $('#securityReport');
                        
                        if (!results) {
                            securityReport.html(`
                                <div class="alert alert-warning">
                                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                                    No security test results available
                                </div>
                            `);
                            return;
                        }
                        
                        // Count passed tests
                        const passedCount = Object.values(results).filter(test => test.status === 'PASS').length;
                        const totalTests = Object.keys(results).length;
                        const allPassed = passedCount === totalTests;
                        
                        let html = `
                            <div class="card mb-4">
                                <div class="card-header ${allPassed ? 'bg-success text-white' : 'bg-warning'}">
                                    <i class="bi ${allPassed ? 'bi-shield-check' : 'bi-shield-exclamation'} me-2"></i>
                                    Security Test Summary
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="d-flex align-items-center">
                                                <div class="display-4 me-3">${passedCount}/${totalTests}</div>
                                                <div>Tests Passed</div>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="progress" style="height: 30px;">
                                                <div class="progress-bar ${allPassed ? 'bg-success' : 'bg-warning'}" 
                                                    style="width: ${(passedCount/totalTests)*100}%;">
                                                    ${Math.round((passedCount/totalTests)*100)}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="alert ${allPassed ? 'alert-success' : 'alert-warning'} mt-3">
                                        <i class="bi ${allPassed ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2"></i>
                                        ${allPassed ? 'Your Noise Protocol implementation passed all security tests!' : 
                                            'Some security tests did not pass. Check details below.'}
                                    </div>
                                </div>
                            </div>
                        `;
                        
                        // Add test results
                        html += '<div class="accordion" id="securityTestAccordion">';
                        
                        // Define test information
                        const testInfo = {
                            handshake: {
                                title: 'Handshake Integrity',
                                description: 'Tests that handshake messages are correctly formatted and processed.',
                                icon: 'bi-shuffle'
                            },
                            encryption: {
                                title: 'Encryption Correctness',
                                description: 'Verifies that messages are properly encrypted and decrypted.',
                                icon: 'bi-lock'
                            },
                            replay: {
                                title: 'Replay Attack Resistance',
                                description: 'Tests if the system detects and prevents message replay attacks.',
                                icon: 'bi-arrow-repeat'
                            },
                            authentication: {
                                title: 'Authentication',
                                description: 'Checks that the system properly authenticates parties during communication.',
                                icon: 'bi-person-badge'
                            },
                            kci: {
                                title: 'Key Compromise Impersonation Resistance',
                                description: 'Tests resistance against attacks where a compromised key might be used for impersonation.',
                                icon: 'bi-key'
                            },
                            mitm: {
                                title: 'Man-in-the-Middle Resistance',
                                description: 'Verifies that the protocol can detect message tampering in transit.',
                                icon: 'bi-people'
                            }
                        };
                        
                        // Generate accordion items
                        let i = 0;
                        for (const [testName, result] of Object.entries(results)) {
                            const isPassed = result.status === 'PASS';
                            const testDetails = testInfo[testName] || {
                                title: testName.charAt(0).toUpperCase() + testName.slice(1),
                                description: 'Tests the security of the Noise Protocol implementation.',
                                icon: 'bi-shield'
                            };
                            
                            html += `
                                <div class="accordion-item">
                                    <h2 class="accordion-header" id="heading${i}">
                                        <button class="accordion-button ${i > 0 ? 'collapsed' : ''}" type="button" 
                                                data-bs-toggle="collapse" data-bs-target="#collapse${i}" 
                                                aria-expanded="${i === 0 ? 'true' : 'false'}" aria-controls="collapse${i}">
                                            <i class="bi ${testDetails.icon} me-2"></i>
                                            <span class="me-3">${testDetails.title}</span>
                                            <span class="badge ${isPassed ? 'bg-success' : 'bg-danger'} ms-auto">
                                                ${isPassed ? 'PASS' : 'FAIL'}
                                            </span>
                                        </button>
                                    </h2>
                                    <div id="collapse${i}" class="accordion-collapse collapse ${i === 0 ? 'show' : ''}" 
                                         aria-labelledby="heading${i}" data-bs-parent="#securityTestAccordion">
                                        <div class="accordion-body">
                                            <p class="mb-3">${testDetails.description}</p>
                                            <div class="card ${isPassed ? 'border-success' : 'border-danger'}">
                                                <div class="card-header ${isPassed ? 'bg-success text-white' : 'bg-danger text-white'}">
                                                    Result
                                                </div>
                                                <div class="card-body">
                                                    <p>${result.message}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;
                            i++;
                        }
                        
                        html += '</div>';
                        
                        securityReport.html(html);
                    }
                    
                    $('#runSecurityTestsBtn').on('click', function() {
                        runSecurityTests();
                    });
                    
                    // Performance Stats Functions
                    $('#runPerformanceTestBtn').on('click', function() {
                        const performanceResults = $('#performanceResults');
                        const downloadBtn = $('#downloadResultsBtn');
                        
                        // Check if user is connected
                        if (!connected) {
                            performanceResults.html(`
                                <div class="alert alert-warning">
                                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                                    Please connect to a server before running performance tests
                                </div>
                            `);
                            return;
                        }
                        
                        // Get test configuration
                        const messageCount = $('#messageCount').val();
                        const messageSize = $('#messageSize').val();
                        const protocols = Array.from($('#protocolSelection option:selected')).map(opt => opt.value);
                        const outputFormat = $('input[name="outputFormat"]:checked').val();
                        
                        // Show loading state
                        performanceResults.html(`
                            <div class="text-center py-5">
                                <div class="spinner-border text-primary" role="status"></div>
                                <p class="mt-3">Running performance tests...</p>
                                <div class="progress mt-3">
                                    <div id="performanceTestProgress" class="progress-bar progress-bar-striped progress-bar-animated" 
                                        style="width: 0%"></div>
                                </div>
                                <p class="small text-muted mt-2">This may take a few minutes...</p>
                            </div>
                        `);
                        
                        // Disable button during test
                        $(this).prop('disabled', true);
                        $(this).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Running...');
                        
                        // Start the performance test
                        $.ajax({
                            url: '/performance_test',
                            type: 'POST',
                            contentType: 'application/json',
                            data: JSON.stringify({
                                num_messages: parseInt(messageCount),
                                message_size: parseInt(messageSize),
                                protocols: protocols,
                                output_format: outputFormat
                            }),
                            success: function(response) {
                                if (response.success) {
                                    // Start polling for results
                                    if (performanceTestInterval) {
                                        clearInterval(performanceTestInterval);
                                    }
                                    
                                    let progress = 0;
                                    performanceTestInterval = setInterval(() => {
                                        // Update progress bar
                                        if (progress < 100) {
                                            progress += 2;
                                            $('#performanceTestProgress').css('width', progress + '%');
                                        }
                                        
                                        // Check status
                                        $.get(`/performance_test_status?format=${outputFormat}`)
                                            .done(function(statusData) {
                                                if (statusData.status === 'completed' || progress >= 100) {
                                                    // Tests completed
                                                    clearInterval(performanceTestInterval);
                                                    displayPerformanceResults(statusData.results, outputFormat);
                                                    
                                                    // Enable download button
                                                    downloadBtn.prop('disabled', false);
                                                    
                                                    // Reset run button
                                                    $('#runPerformanceTestBtn').prop('disabled', false);
                                                    $('#runPerformanceTestBtn').html('<i class="bi bi-play-fill me-1"></i>Run Performance Test');
                                                }
                                            });
                                    }, 500);
                                } else {
                                    performanceResults.html(`
                                        <div class="alert alert-danger">
                                            <i class="bi bi-x-circle-fill me-2"></i>
                                            Failed to start performance tests: ${response.message || 'Unknown error'}
                                        </div>
                                    `);
                                    
                                    // Reset button
                                    $('#runPerformanceTestBtn').prop('disabled', false);
                                    $('#runPerformanceTestBtn').html('<i class="bi bi-play-fill me-1"></i>Run Performance Test');
                                }
                            },
                            error: function() {
                                performanceResults.html(`
                                    <div class="alert alert-danger">
                                        <i class="bi bi-x-circle-fill me-2"></i>
                                        Network error when starting performance tests
                                    </div>
                                `);
                                
                                // Reset button
                                $('#runPerformanceTestBtn').prop('disabled', false);
                                $('#runPerformanceTestBtn').html('<i class="bi bi-play-fill me-1"></i>Run Performance Test');
                            }
                        });
                    });
                    
                    function displayPerformanceResults(results, format) {
                        const performanceResults = $('#performanceResults');
                        
                        if (!results) {
                            performanceResults.html(`
                                <div class="alert alert-warning">
                                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                                    No performance test results available
                                </div>
                            `);
                            return;
                        }
                        
                        // First enable download button
                        $('#downloadResultsBtn').prop('disabled', false);
                        
                        // Format determines how to display results
                        if (format === 'table') {
                            // Table view
                            let html = `
                                <div class="card">
                                    <div class="card-header bg-primary text-white">
                                        <i class="bi bi-table me-2"></i>Performance Comparison Results
                                    </div>
                                    <div class="card-body">
                                        <div class="table-responsive">
                                            <table class="table table-striped table-hover">
                                                <thead>
                                                    <tr>
                                                        <th>Metric</th>
                                                        ${Object.keys(results).map(protocol => 
                                                            `<th class="text-center">${protocol.toUpperCase()}</th>`).join('')}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td>Handshake Time (s)</td>
                                                        ${Object.keys(results).map(protocol => 
                                                            `<td class="text-center">${results[protocol].handshake_time.toFixed(4)}</td>`).join('')}
                                                    </tr>
                                                    <tr>
                                                        <td>Avg Latency (ms)</td>
                                                        ${Object.keys(results).map(protocol => 
                                                            `<td class="text-center">${(results[protocol].avg_latency * 1000).toFixed(2)}</td>`).join('')}
                                                    </tr>
                                                    <tr>
                                                        <td>Min Latency (ms)</td>
                                                        ${Object.keys(results).map(protocol => 
                                                            `<td class="text-center">${(results[protocol].min_latency * 1000).toFixed(2)}</td>`).join('')}
                                                    </tr>
                                                    <tr>
                                                        <td>Max Latency (ms)</td>
                                                        ${Object.keys(results).map(protocol => 
                                                            `<td class="text-center">${(results[protocol].max_latency * 1000).toFixed(2)}</td>`).join('')}
                                                    </tr>
                                                    <tr>
                                                        <td>Throughput (msg/s)</td>
                                                        ${Object.keys(results).map(protocol => 
                                                            `<td class="text-center">${results[protocol].throughput.toFixed(2)}</td>`).join('')}
                                                    </tr>
                                                    <tr>
                                                        <td>CPU Usage (%)</td>
                                                        ${Object.keys(results).map(protocol => 
                                                            `<td class="text-center">${results[protocol].cpu_usage.toFixed(1)}</td>`).join('')}
                                                    </tr>
                                                    <tr>
                                                        <td>Memory Usage (MB)</td>
                                                        ${Object.keys(results).map(protocol => 
                                                            `<td class="text-center">${results[protocol].memory_usage.toFixed(1)}</td>`).join('')}
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            `;
                            performanceResults.html(html);
                        } else if (format === 'chart') {
                            // Check if we have chart_data from the API
                            $.get('/performance_test_status?format=chart')
                                .done(function(data) {
                                    if (data.success && data.chart_data) {
                                        // Use the chart data from the API
                                        renderChartFromData(data.chart_data, performanceResults);
                                        
                                        // Set download URLs
                                        if (data.csv_url) {
                                            $('#downloadResultsBtn').data('csv-url', data.csv_url);
                                        }
                                        if (data.json_url) {
                                            $('#downloadResultsBtn').data('json-url', data.json_url);
                                        }
                                    } else {
                                        // Fall back to generating chart from results
                                        renderChartFromResults(results, performanceResults);
                                    }
                                })
                                .fail(function() {
                                    // Fall back to generating chart from results
                                    renderChartFromResults(results, performanceResults);
                                });
                        } else if (format === 'json') {
                            // JSON view
                            const jsonStr = JSON.stringify(results, null, 2);
                            let html = `
                                <div class="card">
                                    <div class="card-header bg-primary text-white">
                                        <i class="bi bi-braces me-2"></i>JSON Results
                                    </div>
                                    <div class="card-body">
                                        <pre class="json-results mb-0">${escapeHtml(jsonStr)}</pre>
                                    </div>
                                </div>
                                <style>
                                    .json-results {
                                        background-color: #f8f9fa;
                                        padding: 1rem;
                                        border-radius: 0.25rem;
                                        max-height: 500px;
                                        overflow-y: auto;
                                    }
                                </style>
                            `;
                            performanceResults.html(html);
                        }
                    }
                    
                    function renderChartFromData(chartData, container) {
                        // Render chart based on the provided data in standardized format
                        let html = `
                            <div class="card">
                                <div class="card-header bg-primary text-white">
                                    <i class="bi bi-bar-chart-fill me-2"></i>Performance Comparison Charts
                                </div>
                                <div class="card-body">
                                    <div class="row">
                        `;
                        
                        // Add charts for each metric
                        const metrics = chartData.metrics;
                        const protocols = chartData.protocols;
                        
                        // Define better colors
                        const colors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];
                        
                        // For each metric, create a chart
                        Object.keys(metrics).forEach((metricKey, index) => {
                            const metric = metrics[metricKey];
                            const values = metric.values;
                            
                            // Find max for scaling
                            const maxValue = Math.max(...values) * 1.1;
                            
                            html += `
                                <div class="col-md-6 mb-4">
                                    <div class="card">
                                        <div class="card-header">${metric.label}</div>
                                        <div class="card-body">
                                            <div class="chart-container">
                                                <div class="chart-placeholder">
                            `;
                            
                            // Create bars for each protocol
                            protocols.forEach((protocol, i) => {
                                const value = values[i];
                                let height;
                                
                                // Adjust height depending on metric
                                if (metricKey === 'handshake_time') {
                                    height = (value / maxValue) * 180;
                                } else if (metricKey === 'latency') {
                                    height = (value / maxValue) * 180;
                                } else if (metricKey === 'throughput') {
                                    height = (value / maxValue) * 180;
                                } else {
                                    height = (value / maxValue) * 180;
                                }
                                
                                html += `
                                    <div class="chart-bar" style="height: ${height}px; background-color: ${colors[i % colors.length]}">
                                        <div class="chart-value">${value.toFixed(2)}${metricKey === 'latency' ? 'ms' : ''}</div>
                                        <div class="chart-label">${protocol}</div>
                                    </div>
                                `;
                            });
                            
                            html += `
                                                </div>
                                            </div>
                                            <div class="mt-2 text-center text-muted small">
                                                <i class="bi bi-info-circle me-1"></i>
                                                ${metric.better === 'lower' ? 'Lower is better' : 'Higher is better'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        });
                        
                        html += `
                                    </div>
                                </div>
                            </div>
                            <style>
                                .chart-container {
                                    height: 250px;
                                    display: flex;
                                    align-items: flex-end;
                                    justify-content: center;
                                }
                                .chart-placeholder {
                                    width: 100%;
                                    height: 200px;
                                    display: flex;
                                    align-items: flex-end;
                                    justify-content: space-around;
                                }
                                .chart-bar {
                                    width: 40px;
                                    min-height: 30px;
                                    position: relative;
                                    text-align: center;
                                    color: white;
                                    padding-top: 5px;
                                    border-radius: 4px 4px 0 0;
                                }
                                .chart-value {
                                    position: absolute;
                                    top: -25px;
                                    left: 0;
                                    right: 0;
                                    color: #333;
                                    font-size: 12px;
                                }
                                .chart-label {
                                    position: absolute;
                                    bottom: -25px;
                                    left: 0;
                                    right: 0;
                                    color: #333;
                                    font-size: 12px;
                                }
                            </style>
                        `;
                        
                        container.html(html);
                    }
                    
                    function renderChartFromResults(results, container) {
                        // Traditional chart visualization from results object
                        let html = `
                            <div class="card">
                                <div class="card-header bg-primary text-white">
                                    <i class="bi bi-bar-chart-fill me-2"></i>Performance Comparison Charts
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-6 mb-4">
                                            <div class="card">
                                                <div class="card-header">Handshake Time (seconds)</div>
                                                <div class="card-body">
                                                    <div class="chart-container">
                                                        <div class="chart-placeholder">
                                                            ${Object.keys(results).map((protocol, i) => `
                                                                <div class="chart-bar" style="height: ${results[protocol].handshake_time * 200}px; background-color: ${['#4285F4', '#EA4335', '#FBBC05', '#34A853'][i % 4]}">
                                                                    <div class="chart-value">${results[protocol].handshake_time.toFixed(4)}</div>
                                                                    <div class="chart-label">${protocol.toUpperCase()}</div>
                                                                </div>
                                                            `).join('')}
                                                        </div>
                                                    </div>
                                                    <div class="mt-2 text-center text-muted small">
                                                        <i class="bi bi-info-circle me-1"></i>Lower is better
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-6 mb-4">
                                            <div class="card">
                                                <div class="card-header">Average Latency (ms)</div>
                                                <div class="card-body">
                                                    <div class="chart-container">
                                                        <div class="chart-placeholder">
                                                            ${Object.keys(results).map((protocol, i) => `
                                                                <div class="chart-bar" style="height: ${results[protocol].avg_latency * 20000}px; background-color: ${['#4285F4', '#EA4335', '#FBBC05', '#34A853'][i % 4]}">
                                                                    <div class="chart-value">${(results[protocol].avg_latency * 1000).toFixed(2)}</div>
                                                                    <div class="chart-label">${protocol.toUpperCase()}</div>
                                                                </div>
                                                            `).join('')}
                                                        </div>
                                                    </div>
                                                    <div class="mt-2 text-center text-muted small">
                                                        <i class="bi bi-info-circle me-1"></i>Lower is better
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-6 mb-4">
                                            <div class="card">
                                                <div class="card-header">Throughput (msg/s)</div>
                                                <div class="card-body">
                                                    <div class="chart-container">
                                                        <div class="chart-placeholder">
                                                            ${Object.keys(results).map((protocol, i) => `
                                                                <div class="chart-bar" style="height: ${results[protocol].throughput / 10}px; background-color: ${['#4285F4', '#EA4335', '#FBBC05', '#34A853'][i % 4]}">
                                                                    <div class="chart-value">${results[protocol].throughput.toFixed(2)}</div>
                                                                    <div class="chart-label">${protocol.toUpperCase()}</div>
                                                                </div>
                                                            `).join('')}
                                                        </div>
                                                    </div>
                                                    <div class="mt-2 text-center text-muted small">
                                                        <i class="bi bi-info-circle me-1"></i>Higher is better
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-6 mb-4">
                                            <div class="card">
                                                <div class="card-header">Resource Usage</div>
                                                <div class="card-body">
                                                    <div class="chart-container">
                                                        <div class="chart-placeholder">
                                                            ${Object.keys(results).map((protocol, i) => `
                                                                <div class="chart-bar" style="height: ${results[protocol].cpu_usage * 10}px; background-color: ${['#4285F4', '#EA4335', '#FBBC05', '#34A853'][i % 4]}">
                                                                    <div class="chart-value">${results[protocol].cpu_usage.toFixed(1)}% CPU</div>
                                                                    <div class="chart-label">${protocol.toUpperCase()}</div>
                                                                </div>
                                                            `).join('')}
                                                        </div>
                                                    </div>
                                                    <div class="mt-2 text-center text-muted small">
                                                        <i class="bi bi-info-circle me-1"></i>Lower is better
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <style>
                                .chart-container {
                                    height: 250px;
                                    display: flex;
                                    align-items: flex-end;
                                    justify-content: center;
                                }
                                .chart-placeholder {
                                    width: 100%;
                                    height: 200px;
                                    display: flex;
                                    align-items: flex-end;
                                    justify-content: space-around;
                                }
                                .chart-bar {
                                    width: 40px;
                                    min-height: 30px;
                                    position: relative;
                                    text-align: center;
                                    color: white;
                                    padding-top: 5px;
                                    border-radius: 4px 4px 0 0;
                                }
                                .chart-value {
                                    position: absolute;
                                    top: -25px;
                                    left: 0;
                                    right: 0;
                                    color: #333;
                                    font-size: 12px;
                                }
                                .chart-label {
                                    position: absolute;
                                    bottom: -25px;
                                    left: 0;
                                    right: 0;
                                    color: #333;
                                    font-size: 12px;
                                }
                            </style>
                        `;
                        container.html(html);
                    }
                    
                    $('#downloadResultsBtn').on('click', function() {
                        const format = $('input[name="outputFormat"]:checked').val();
                        const csvUrl = $(this).data('csv-url');
                        const jsonUrl = $(this).data('json-url');
                        
                        // If we have direct file URLs, use them first
                        if (format === 'json' && jsonUrl) {
                            window.location.href = jsonUrl;
                            return;
                        } else if ((format === 'table' || format === 'chart') && csvUrl) {
                            window.location.href = csvUrl;
                            return;
                        }
                        
                        // Otherwise, generate files dynamically as before
                        let data, filename, type;
                        
                        if (format === 'json') {
                            // Create JSON file
                            $.get('/performance_test_status?format=json')
                                .done(function(response) {
                                    if (response.results) {
                                        // Check if we have a JSON URL now
                                        if (response.json_url) {
                                            window.location.href = response.json_url;
                                        } else {
                                            // Generate file client-side
                                            data = JSON.stringify(response.results, null, 2);
                                            filename = 'noise_protocol_performance.json';
                                            type = 'application/json';
                                            downloadData(data, filename, type);
                                        }
                                    } else {
                                        showAlert('No results available to download', 'warning');
                                    }
                                })
                                .fail(function() {
                                    showAlert('Failed to get performance results', 'danger');
                                });
                        } else {
                            // Create CSV file for table format
                            $.get('/performance_test_status')
                                .done(function(response) {
                                    // Check if we have a CSV URL now
                                    if (response.csv_url) {
                                        window.location.href = response.csv_url;
                                    } else if (response.results) {
                                        // Generate CSV client-side
                                        const results = response.results;
                                        let csv = 'Protocol,Handshake Time (s),Avg Latency (ms),Min Latency (ms),Max Latency (ms),Throughput (msg/s),CPU Usage (%),Memory Usage (MB)\n';
                                        
                                        // Add a row for each protocol
                                        for (const protocol of Object.keys(results)) {
                                            const r = results[protocol];
                                            csv += [
                                                protocol.toUpperCase(),
                                                r.handshake_time.toFixed(4),
                                                (r.avg_latency * 1000).toFixed(2),
                                                (r.min_latency * 1000).toFixed(2),
                                                (r.max_latency * 1000).toFixed(2),
                                                r.throughput.toFixed(2),
                                                r.cpu_usage.toFixed(1),
                                                r.memory_usage.toFixed(1)
                                            ].join(',') + '\n';
                                        }
                                        
                                        data = csv;
                                        filename = 'noise_protocol_performance.csv';
                                        type = 'text/csv';
                                        downloadData(data, filename, type);
                                    } else {
                                        showAlert('No results available to download', 'warning');
                                    }
                                })
                                .fail(function() {
                                    showAlert('Failed to get performance results', 'danger');
                                });
                        }
                    });
                    
                    function downloadData(data, filename, type) {
                        // Create a blob with the data
                        const blob = new Blob([data], {type: type});
                        
                        // Create a download link
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = filename;
                        
                        // Append to the document
                        document.body.appendChild(link);
                        
                        // Trigger click
                        link.click();
                        
                        // Cleanup
                        setTimeout(() => {
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                        }, 100);
                        
                        // Show success message
                        showSuccess(`Downloaded ${filename}`);
                    }
                    
                    // Expose functions for global access
                    window.createRoom = createRoom;
                    window.joinRoom = joinRoom;
                    window.leaveRoom = leaveRoom;
                    window.refreshRoomList = refreshRoomList;
                    window.showRoomMembers = showRoomMembers;
                    window.refreshRoomListInModal = refreshRoomListInModal;
                    window.loadCurrentRoomInfo = loadCurrentRoomInfo;
                    window.runSecurityTests = runSecurityTests;
                    window.loadReceivedFiles = loadReceivedFiles;
                });