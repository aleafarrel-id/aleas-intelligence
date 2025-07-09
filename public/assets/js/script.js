document.addEventListener('DOMContentLoaded', async () => {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatDisplay = document.getElementById('chat-display');
    const modelSelectButton = document.getElementById('model-select-button');
    const selectedModelName = document.getElementById('selected-model-name');
    const modelDropdownContent = document.getElementById('model-dropdown-content');
    const micButton = document.getElementById('mic-button');

    let availableModels = [];
    let selectedModel = null;

    const settingsBtn = document.getElementById('settings-button');
    const settingsOverlay = document.getElementById('settings-overlay');
    const settingsClose = document.getElementById('settings-close');
    const clearHistory = document.getElementById('clear-history');

    // Show settings overlay
    settingsBtn?.addEventListener('click', e => {
        e.stopPropagation();
        settingsOverlay.classList.add('active');
        
        setTimeout(() => {
            const focusables = settingsOverlay.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusables.length) focusables[0].focus();
        }, 50);

        if (!settingsOverlay.dataset.trapAttached) {
            trapFocusInOverlay(settingsOverlay);
            settingsOverlay.dataset.trapAttached = "true";
        }
    });

    // Close settings overlay
    settingsClose?.addEventListener('click', () => {
        settingsOverlay.classList.remove('active');
    });

    settingsOverlay?.addEventListener('click', e => {
        if (e.target === settingsOverlay) {
            settingsOverlay.classList.remove('active');
        }
    });

    // Delete chat history
    clearHistory?.addEventListener('click', async () => {
        if (!confirm('Hapus seluruh riwayat chat?')) return;
        
        // Refresh UI for instant feedback
        chatDisplay.innerHTML = ''; 
        
        try {
            const response = await fetch('../includes/memory/delete_chat_history.php', { method: 'POST' });
            const data = await response.json();
            settingsOverlay.classList.remove('active');
        
            alert(data.message); 
            await loadChatHistory(); 
        } catch (err) {
            console.error('Error deleting history:', err);
            
            alert('Terjadi kesalahan saat menghapus riwayat chat. Silakan coba lagi');
        }
    });

    // Dark Mode Toggle Functionality
    const appHeader = document.querySelector('.app-header');
    const headerDropdown = document.getElementById('header-dropdown');
    const themeToggleButton = document.getElementById('theme-toggle-button');
    const moonIcon = document.getElementById('moon-icon');
    const sunIcon = document.getElementById('sun-icon');

    // Toggle dropdown visibility for header dropdown
    appHeader.addEventListener('click', (e) => {
        const appHeaderP = appHeader.querySelector('p');
        if (e.target === appHeaderP) {
            headerDropdown.classList.toggle('show');
        }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        const appHeaderP = appHeader.querySelector('p');

        if (!appHeaderP.contains(e.target) && !headerDropdown.contains(e.target)) {
            headerDropdown.classList.remove('show');
        }
        
        // Close model dropdown if click is outside its button and outside the dropdown content
        if (!modelSelectButton?.contains(e.target) && !modelDropdownContent?.contains(e.target)) {
            modelDropdownContent?.classList.remove('show');
            modelSelectButton?.classList.remove('active');
        }
    });

    // Helper function to update theme icons and title
    function updateThemeIcons(isDarkMode) {
        if (isDarkMode) {
            moonIcon.style.display = 'none';
            sunIcon.style.display = 'block';
            themeToggleButton.title = "Switch to light mode";
        } else {
            moonIcon.style.display = 'block';
            sunIcon.style.display = 'none';
            themeToggleButton.title = "Switch to dark mode";
        }
    }

    // Theme toggle functionality
    themeToggleButton.addEventListener('click', (e) => {
        e.stopPropagation();
        
        requestAnimationFrame(() => {
            const isDarkMode = document.body.classList.toggle('dark');
            
            updateThemeIcons(isDarkMode);
            
            // Save user preference to localStorage
            localStorage.setItem('darkMode', isDarkMode);
        });
    });

    // Initialize theme based on user preference and system preference
    function initTheme() {
        const saved = localStorage.getItem('darkMode');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)'); // Get MediaQueryList object

        let isDark;

        if (saved !== null) {
            // If there is a saved preference, use it
            isDark = (saved === 'true');
        } else {
            // If there is no saved preference, use the system preference as default
            isDark = systemPrefersDark.matches;
            // And save the system preference to localStorage to ensure consistency
            localStorage.setItem('darkMode', isDark);
        }

        if (isDark) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
        updateThemeIcons(isDark);
    }

    // Listen for changes in the system's color scheme preference
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // When the system preference changes, update localStorage and reinitialize the theme
        const isSystemDark = e.matches;
        localStorage.setItem('darkMode', isSystemDark); // Save the system preference to localStorage
        initTheme();
    });

    // Initialize theme when the script loads
    initTheme();

    // Generate a unique ID for each message
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async function loadAvailableModels() {
        try {
            const response = await fetch('../includes/user_endpoint/load_models.php');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (data.success && data.models?.length) {
                availableModels = data.models.map(model => ({ id: model.id, name: model.name }));

                // Load AI model saved in localStorage
                const storedModelId = localStorage.getItem('selectedModelId');
                const storedModel = availableModels.find(model => model.id === storedModelId);

                // Use stored model if available, otherwise use the first available model
                selectedModel = storedModel || availableModels[0];

                loadModelsIntoDropdown();
                updateSelectedModelDisplay();
            } else throw new Error(data.error || 'No active models available');
        } catch (error) {
            console.error('Failed to load AI model');
            setDefaultModels(); // Call fallback function if API fails
        }
    }

    // Function to set default models if API fails
    function setDefaultModels() {
        if (availableModels.length > 0) {
            selectedModel = availableModels[0];
        } else {
            console.error('Tidak ada model tersedia');
        }
        loadModelsIntoDropdown();
        updateSelectedModelDisplay();
    }

    function loadModelsIntoDropdown() {
        if (!modelDropdownContent) return;
        modelDropdownContent.innerHTML = '';
        availableModels.forEach(model => {
            const modelOption = document.createElement('a');
            modelOption.href = '#';
            modelOption.textContent = model.name;
            modelOption.dataset.modelId = model.id;
            if (selectedModel && model.id === selectedModel.id) modelOption.classList.add('selected');
            modelOption.addEventListener('click', (e) => {
                e.preventDefault();
                selectModel(model);
            });
            modelDropdownContent.appendChild(modelOption);
        });
    }

    function updateSelectedModelDisplay() {
        if (selectedModel && selectedModelName) selectedModelName.textContent = selectedModel.name;
    }

    function selectModel(model) {
        if (!model || !model.id || !model.name) return;
        selectedModel = model;

        // Save selected model to localStorage
        localStorage.setItem('selectedModelId', model.id);

        updateSelectedModelDisplay();
        if (modelDropdownContent) {
            const options = modelDropdownContent.querySelectorAll('a');
            options.forEach(option => option.classList.toggle('selected', option.dataset.modelId === model.id));
        }
        toggleModelDropdown();
    }

    function toggleModelDropdown() {
        if (!modelDropdownContent || !modelSelectButton) return;
        modelDropdownContent.classList.toggle('show');
        modelSelectButton.classList.toggle('active');
    }

    // Function to format code blocks
    function formatCodeBlock(code, lang = '') {
        // Escape HTML entities to prevent XSS attacks
        const escapeHtml = (unsafe) => {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };

        const escapedCode = escapeHtml(code);
        const languageLabel = lang ? `<div class="code-language-label">${lang}</div>` : '';

        return `<div class="code-block-container">
            ${languageLabel}
            <div class="code-block-header">
                <button class="copy-button" title="Salin">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
            </div>
            <pre><code>${escapedCode}</code></pre>
        </div>`;
    }

    function formatAIResponse(message) {
        if (!message) return '';
        let formatted = message;

        // Handle code blocks
        formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return formatCodeBlock(code, lang);
        });

        // Format inline code
        formatted = formatted.replace(/`([^`]+)`/g, (match, code) => {
            return `<code>${escapeHtml(code)}</code>`;
        });

        // Convert markdown tables to HTML
        formatted = formatted.replace(/(\|.+\|(\r?\n)){2,}(\|.+\|)?/g, (match) => {
            const rows = match.trim().split('\n');
            if (rows.length < 3) return match;

            // Process table header
            const headerCells = rows[0].split('|').filter(cell => cell.trim() !== '');
            let tableHtml = '<div class="table-container"><table><thead><tr>';
            headerCells.forEach(cell => {
                tableHtml += `<th>${cell.trim()}</th>`;
            });
            tableHtml += '</tr></thead>';

            // Process table body
            tableHtml += '<tbody>';
            for (let i = 2; i < rows.length; i++) {
                const rowCells = rows[i].split('|').filter(cell => cell.trim() !== '');
                if (rowCells.length === 0) continue;

                tableHtml += '<tr>';
                rowCells.forEach(cell => {
                    tableHtml += `<td>${cell.trim()}</td>`;
                });
                tableHtml += '</tr>';
            }
            tableHtml += '</tbody></table></div>';

            return tableHtml;
        });

        formatted = formatted.replace(/^######\s*(.+)$/gm, '<h6>$1</h6>');
        formatted = formatted.replace(/^#####\s*(.+)$/gm, '<h5>$1</h5>');
        formatted = formatted.replace(/^####\s*(.+)$/gm, '<h4>$1</h4>');
        formatted = formatted.replace(/^###\s*(.+)$/gm, '<h3>$1</h3>');
        formatted = formatted.replace(/^##\s*(.+)$/gm, '<h2>$1</h2>');
        formatted = formatted.replace(/^#\s*(.+)$/gm, '<h1>$1</h1>');

        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        formatted = formatted.replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>');

        formatted = formatted.replace(/(^|\n)\s*([*+\-])\s+(.+)$/gm, '$1<li>$3</li>');
        formatted = formatted.replace(/(^|\n)\s*(\d+\.)\s+(.+)$/gm, '$1<li>$3</li>');

        formatted = formatted.replace(/((?:<li>.*?<\/li>\s*)+)/gs, match => {
            if (match.match(/^\s*<li>\d+\./m)) return `<ol>${match}</ol>`;
            else if (match.startsWith('<li>')) return `<ul>${match}</ul>`;
            return match;
        });

        let lines = formatted.split('\n');
        let processedLines = [];
        let inBlock = false;

        lines.forEach(line => {
            line = line.trim();
            const isBlockStart = line.match(/^(<h[1-6]>|<pre>|<ul|<ol>)/i);
            const isBlockEnd = line.match(/(<\/h[1-6]>|<\/pre>|<\/ul>|<\/ol>)$/i);
            if (isBlockStart) {
                inBlock = true;
                processedLines.push(line);
            } else if (isBlockEnd) {
                processedLines.push(line);
                inBlock = false;
            } else if (line.length === 0) {
                if (!inBlock && processedLines.length && !processedLines[processedLines.length-1].endsWith('<br>'))
                    processedLines.push('<br>');
            } else {
                if (!inBlock && !line.startsWith('<') && !line.endsWith('>')) processedLines.push(`<p>${line}</p>`);
                else processedLines.push(line);
            }
        });

        formatted = processedLines.join('\n');
        formatted = formatted.replace(/(<br>\s*){2,}/g, '<br>');
        formatted = formatted.replace(/(<h[1-6]>|<p>|<ul>|<ol>|<pre>)\s*<br>/g, '$1');
        formatted = formatted.replace(/<br>\s*(<\/h[1-6]>|<\/p>|<\/ul>|<\/ol>|<\/pre>)/g, '$1');
        formatted = formatted.replace(/^\s*<br>/, '');
        formatted = formatted.replace(/<br>\s*$/, '');

        // Sanitize HTML using DOMPurify
        if (window.DOMPurify) {
            formatted = DOMPurify.sanitize(formatted);
        }

        formatted += '<span class="typing-cursor"></span>';
        return formatted;
    }

    // Function to add a message to the chat display
    function addMessage(sender, message, memoryId = null, isCore = false) {
        if (!chatDisplay || !message) return;
        const chatRow = document.createElement('div');
        chatRow.classList.add('chat-row');
        
        // Container for avatar and message content (bubble and wrapper)
        const contentWrapper = document.createElement('div');
        contentWrapper.classList.add('ai-content-wrapper');

        const messageBubble = document.createElement('div');
        messageBubble.classList.add('message-bubble');

        if (sender === 'user') {
            chatRow.classList.add('user-chat-row');
            messageBubble.innerHTML = `<p>${message.replace(/\n/g, '<br>')}</p>`;
            chatRow.appendChild(messageBubble);
        } else {
            chatRow.classList.add('ai-chat-row');
            const aiAvatar = document.createElement('div');
            aiAvatar.classList.add('avatar', 'ai-avatar');
            aiAvatar.textContent = 'A';
            chatRow.appendChild(aiAvatar);
            
            const aiMessageContent = document.createElement('div');
            aiMessageContent.classList.add('ai-message-content');
            aiMessageContent.innerHTML = formatAIResponse(message);
            messageBubble.appendChild(aiMessageContent);
            contentWrapper.appendChild(messageBubble); // Put bubble inside wrapper

            // Container for action buttons under the AI Bubble
            const actionButtonsContainer = document.createElement('div');
            actionButtonsContainer.classList.add('ai-action-buttons');
            
            // Action bubble
            addCopyButtonToAIMessage(actionButtonsContainer, aiMessageContent);
            addExpandButtonToAIMessage(actionButtonsContainer, aiMessageContent);
            if (memoryId) {
                addPinButtonToAIMessage(actionButtonsContainer, memoryId, isCore);
            }

            contentWrapper.appendChild(actionButtonsContainer); // Put buttons inside wrapper
            chatRow.appendChild(contentWrapper); // Put wrapper inside row
        }

        chatDisplay.appendChild(chatRow);
        chatDisplay.scrollTop = chatDisplay.scrollHeight;
    }

    // Function to auto-resize textarea
    function autoResizeTextarea() {
        if (!userInput) return;
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
        const maxHeight = 120;
        if (userInput.scrollHeight > maxHeight) {
            userInput.style.height = maxHeight + 'px';
            userInput.style.overflowY = 'auto';
        } else userInput.style.overflowY = 'hidden';
    }

    // Voice recognition variable
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let dataArray = null;
    let animationId = null;
    let currentRecordingBubble = null;
    let isVoiceProcessing = false;
    let mediaStream = null;
    let voiceAbortController = null;

    // Mic button functionality
    if (micButton) {
        micButton.addEventListener('click', async () => {
            // If mic button is clicked while recording, stop recording and process audio
            if (isRecording) {
                if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                }
                stopRecordingAndProcess();
                return;
            }

            // Ignore if voice processing or AI is generating
            if (isVoiceProcessing || isGenerating) {
                 return;
            }

            // Start voice recognition
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaStream = stream;
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                voiceAbortController = new AbortController(); // Initialize AbortController for voice recognition

                // Setup Web Audio API for audio visualization
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 32;
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);
                dataArray = new Uint8Array(analyser.frequencyBinCount);

                // Create recording bubble
                const chatRow = document.createElement('div');
                chatRow.classList.add('chat-row', 'user-chat-row');
                const messageBubble = document.createElement('div');
                messageBubble.classList.add('message-bubble', 'recording-bubble');
                messageBubble.innerHTML = `
                    <div class="wave-container">
                        <div class="wave-bar"></div>
                        <div class="wave-bar"></div>
                        <div class="wave-bar"></div>
                        <div class="wave-bar"></div>
                        <div class="wave-bar"></div>
                        <div class="wave-bar"></div>
                    </div>
                    <button id="send-audio-button" class="send-audio-button">Kirim</button>
                `;
                chatRow.appendChild(messageBubble);
                chatDisplay.appendChild(chatRow);
                chatDisplay.scrollTop = chatDisplay.scrollHeight;

                currentRecordingBubble = messageBubble;

                // Event listener for send audio button
                const sendAudioButton = document.getElementById('send-audio-button');
                if (sendAudioButton) {
                    sendAudioButton.addEventListener('click', () => {
                        stopRecordingAndProcess(); 
                    });
                }

                // Function to update wave bars based on audio data
                const updateWaveBars = () => {
                    if (!analyser || !currentRecordingBubble) return;
                    analyser.getByteFrequencyData(dataArray);

                    // Calculate average volume
                    let sum = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        sum += dataArray[i];
                    }
                    const averageVolume = sum / dataArray.length;

                    // Update wave bars
                    const waveBars = currentRecordingBubble.querySelectorAll('.wave-bar');
                    waveBars.forEach((bar, index) => {
                        const barHeight = 5 + (averageVolume / 5) * (0.8 + Math.sin(Date.now()/200 + index * 0.5)/2);
                        bar.style.height = `${barHeight}px`;
                        bar.style.backgroundColor = `hsl(${200 + averageVolume}, 80%, 50%)`;
                    });

                    animationId = requestAnimationFrame(updateWaveBars);
                };

                // Start wave bar animation
                animationId = requestAnimationFrame(updateWaveBars);

                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = async () => {
                    isRecording = false;

                    // Stop voice recognition
                    if (mediaStream) {
                        mediaStream.getTracks().forEach(track => track.stop());
                        mediaStream = null;
                    }

                    // Stop animation
                    if (animationId) {
                        cancelAnimationFrame(animationId);
                        animationId = null;
                    }

                    // Cleanup audio resources
                    if (microphone) {
                        microphone.disconnect();
                        microphone = null;
                    }
                    if (analyser) {
                        analyser.disconnect();
                        analyser = null;
                    }
                    if (audioContext) {
                        audioContext.close().catch(e => console.error("Error closing audio context:", e));
                        audioContext = null;
                    }

                    // Handle abort signal
                    if (voiceAbortController?.signal?.aborted) {
                        if (currentRecordingBubble) {
                            currentRecordingBubble.innerHTML = `<p class="error-message">Permintaan dibatalkan</p>`;
                        }
                        resetVoiceState(); // Reset status
                        return;
                    }

                    // Transition to voice processing state
                    isVoiceProcessing = true;
                    updateSendButtonState();

                    // Update bubble to show voice recognition status
                    if (currentRecordingBubble) {
                        currentRecordingBubble.innerHTML = `
                            <div class="recognizing-message">
                                <span>Mengenali...</span>
                                <div class="loading-spinner"></div>
                            </div>
                        `;
                    }

                    try {
                        // Create audio blob
                        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

                        // Send audio to backend for transcription
                        const formData = new FormData();
                        formData.append('audio', audioBlob, 'recording.webm');

                        const response = await fetch('../voice_recognizer.php', {
                            method: 'POST',
                            body: formData,
                            signal: voiceAbortController.signal
                        });

                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`Server error: ${response.status}. Details: ${errorText}`);
                        }

                        const result = await response.json();

                        if (result.success) {
                            // Check if abort signal is raised during processing
                            if (voiceAbortController?.signal?.aborted) {
                                if (currentRecordingBubble) {
                                    currentRecordingBubble.innerHTML = `<p class="error-message">Permintaan dibatalkan</p>`;
                                }
                                resetVoiceState();
                                return;
                            }
                            // Update bubble to show recognized text
                            if (currentRecordingBubble) {
                                currentRecordingBubble.innerHTML = `<p>${result.transcript}</p>`;
                            }

                            // Send recognized text to AI
                            sendMessage({ voiceTranscript: result.transcript });
                        } else {
                            // If error occurs, display error message in bubble
                            if (currentRecordingBubble) {
                                currentRecordingBubble.innerHTML = `<p class="error-message">Transkripsi gagal: ${result.error}</p>`;
                            }
                        }
                    } catch (error) {
                        if (error.name === 'AbortError') {
                            if (currentRecordingBubble) {
                                currentRecordingBubble.innerHTML = `<p class="error-message">Permintaan dibatalkan</p>`;
                            }
                        } else {
                            if (currentRecordingBubble) {
                                currentRecordingBubble.innerHTML = `<p class="error-message">Error: ${error.message}</p>`;
                            }
                        }
                    } finally {
                        resetVoiceState();
                    }
                };

                mediaRecorder.start();
                isRecording = true;
                updateSendButtonState();
                micButton.classList.add('active');

            } catch (error) {
                console.error('Error accessing microphone:', error);
                alert('Tidak dapat mengakses mikrofon. Pastikan Anda memberikan izin.');
                resetVoiceState();
            }
        });
    }

    // Function to stop voice recognition and process audio with send button
    function stopRecordingAndProcess() {
        if (isRecording) {
            stopRecording();
            if (audioChunks.length > 0) {
                // Audio processing is handled in mediaRecorder.onstop
            }
        }
    }

    // Function to stop media recorder
    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
    }

    // Function to cancel voice processing
    function cancelVoiceProcessing() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }

        // Stop all audio tracks in media stream
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }

        // Abort fetch request if in progress
        if (voiceAbortController) {
            voiceAbortController.abort();
            voiceAbortController = null;
        }

        // Display cancellation message in current recording bubble
        if (currentRecordingBubble) {
            currentRecordingBubble.innerHTML = `<p class="error-message">Permintaan dibatalkan</p>`;
        }

        resetVoiceState();
    }

    // Function to reset voice state
    function resetVoiceState() {
        isRecording = false;
        isVoiceProcessing = false;
        
        micButton.classList.remove('active');
        updateSendButtonState();

        // Stop animation and cleanup audio resources
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (audioContext) {
            audioContext.close().catch(e => console.error("Error closing audio context:", e));
            audioContext = null;
        }
        if (microphone) {
            microphone.disconnect();
            microphone = null;
        }
        if (analyser) {
            analyser.disconnect();
            analyser = null;
        }
        audioChunks = [];
        currentRecordingBubble = null;
        voiceAbortController = null;
    }

    // Variable to track AI generation state
    let isGenerating = false;
    let abortController = null;

    // Function to update send button state to stop button
    function updateSendButtonState() {
        const sendIcon = sendButton.querySelector('svg');
        if (isGenerating || isVoiceProcessing || isRecording) {
            sendIcon.innerHTML = `
                <rect x="5" y="2.5" width="16.5" height="16.5" rx="2" fill="white"></rect>
            `;
            sendButton.classList.add('stop-button');
            sendButton.title = 'Batalkan Permintaan';
        } else {
            sendIcon.innerHTML = `
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            `;
            sendButton.classList.remove('stop-button');
            sendButton.title = 'Kirim Pesan';
        }
    }

    // Function to cancel AI generation
    function cancelGeneration() {
        if (abortController) {
            abortController.abort();
            isGenerating = false;
            updateSendButtonState();

            // Display cancellation message in last AI message bubble
            const loadingElements = document.querySelectorAll('.loading-container');
            if (loadingElements.length > 0) {
                const lastLoadingElement = loadingElements[loadingElements.length - 1];
                lastLoadingElement.innerHTML = '<div class="error-message">Permintaan dibatalkan</div>';
            }
        }
    }

    // Helper function to escape HTML special characters
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Function to send message to AI
    async function sendMessage(options = {}) {
        const { voiceTranscript } = options;
        let message = voiceTranscript || userInput.value.trim();

        // Check if message is empty or AI is already generating
        if (isGenerating || message === '') return;

        // Setup for new generation
        isGenerating = true;
        abortController = new AbortController();
        
        updateSendButtonState();

        // Only reset user input if not using voice transcript
        let userMessage = message; // Save user message for memory
        if (!voiceTranscript) {
            userInput.value = '';
            autoResizeTextarea();

            addMessage('user', userMessage);
        }

        // Create chat row for AI message
        const aiChatRow = document.createElement('div');
        aiChatRow.classList.add('chat-row', 'ai-chat-row');

        const aiAvatar = document.createElement('div');
        aiAvatar.classList.add('avatar', 'ai-avatar');
        aiAvatar.textContent = 'A';

        // Create new wrapper for message bubble and action buttons
        const aiContentWrapper = document.createElement('div');
        aiContentWrapper.classList.add('ai-content-wrapper');

        const messageBubble = document.createElement('div');
        messageBubble.classList.add('message-bubble');

        // Loading container
        const loadingContainer = document.createElement('div');
        loadingContainer.classList.add('loading-container');

        const thinkingText = document.createElement('span');
        thinkingText.classList.add('thinking-text');
        thinkingText.textContent = 'Berpikir...';

        const spinner = document.createElement('div');
        spinner.classList.add('loading-spinner');

        loadingContainer.appendChild(thinkingText);
        loadingContainer.appendChild(spinner);
        messageBubble.appendChild(loadingContainer);

        // Container for AI message content
        const aiMessageContent = document.createElement('div');
        aiMessageContent.classList.add('ai-message-content');
        aiMessageContent.style.display = 'none';
        messageBubble.appendChild(aiMessageContent);

        aiContentWrapper.appendChild(messageBubble); // Put message bubble inside wrapper

        aiChatRow.appendChild(aiAvatar);
        aiChatRow.appendChild(aiContentWrapper); // Put wrapper inside chat row
        chatDisplay.appendChild(aiChatRow);
        chatDisplay.scrollTop = chatDisplay.scrollHeight;

        let accumulatedResponse = '';
        try {
            if (!selectedModel) throw new Error('Tidak ada model yang dipilih');

            // Send fetch request to backend
            const response = await fetch('../proxy.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, model: selectedModel.id }),
                signal: abortController.signal
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status}. Details: ${errorText}`);
            }

            // Process server response stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let hasReceivedFirstToken = false;

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '') continue;

                    try {
                        if (!line.startsWith('data: ')) continue;

                        const cleanLine = line.substring(6).trim();
                        if (cleanLine === '[DONE]') break;

                        // Handle error message from backend
                        if (cleanLine.includes('"error"')) {
                            const errorData = JSON.parse(cleanLine);
                            throw new Error(errorData.error);
                        }

                        if (!cleanLine.startsWith('{')) continue;

                        const json = JSON.parse(cleanLine);
                        const token = json.choices[0]?.delta?.content || '';

                        if (token) {
                            if (!hasReceivedFirstToken) {
                                loadingContainer.style.display = 'none';
                                aiMessageContent.style.display = 'block';
                            }

                            accumulatedResponse += token;

                            // Display as regular text while streaming
                            aiMessageContent.textContent = accumulatedResponse;

                            const isAtBottom = chatDisplay.scrollHeight - chatDisplay.clientHeight <= chatDisplay.scrollTop + 50;
                            if (isAtBottom) chatDisplay.scrollTop = chatDisplay.scrollHeight;
                        }
                    } catch (error) {
                        throw error;
                    }
                }
            }

            // After finishing streaming, format and display AI response
            aiMessageContent.innerHTML = formatAIResponse(accumulatedResponse);

            // Save memory to database
            const memoryId = generateUUID();
            await saveMemory(userMessage, accumulatedResponse, memoryId);

            // Add action buttons (pin and copy) to action buttons container
            const actionButtonsContainer = document.createElement('div');
            actionButtonsContainer.classList.add('ai-action-buttons');
            
            addCopyButtonToAIMessage(actionButtonsContainer, aiMessageContent);
            addExpandButtonToAIMessage(actionButtonsContainer, aiMessageContent);
            addPinButtonToAIMessage(actionButtonsContainer, memoryId, false); // Default isCore false
            
            aiContentWrapper.appendChild(actionButtonsContainer); // Put action button container to wrapper


        } catch (error) {
            // Handle errors during AI response processing or cancelation
            if (error.name === 'AbortError') {
                console.log('Permintaan AI dibatalkan oleh pengguna.');
                loadingContainer.style.display = 'none';
                aiMessageContent.style.display = 'block';
                aiMessageContent.innerHTML = '<div class="error-message">Permintaan dibatalkan</div>';
                return;
            }

            console.error('Backend communication error:', error);

            loadingContainer.style.display = 'none';
            aiMessageContent.style.display = 'block';

            // Handle error response to user interface
            let errorMessage = error.message;
            let displayMessage = '';

            if (errorMessage.includes('400')) {
                displayMessage = 'Permintaan tidak valid. Periksa kembali input Anda.';
            } else if (errorMessage.includes('401')) {
                displayMessage = 'Kredensial tidak valid atau sesi berakhir. Silakan masuk kembali.';
            } else if (errorMessage.includes('402')) {
                displayMessage = 'Saldo akun tidak mencukupi. Harap tambahkan kredit.';
            } else if (errorMessage.includes('403')) {
                displayMessage = 'Input Anda diblokir karena moderasi.';
            } else if (errorMessage.includes('408')) {
                displayMessage = 'Permintaan Anda melebihi batas waktu.';
            } else if (errorMessage.includes('429') || errorMessage.includes('Limit harian telah tercapai') || errorMessage.includes('quota')) {
                displayMessage = 'Anda telah mencapai limit harian atau batas permintaan.';
            } else if (errorMessage.includes('502')) {
                displayMessage = 'Model tidak tersedia atau respons tidak valid.';
            } else if (errorMessage.includes('503')) {
                displayMessage = 'Penyedia model tidak tersedia. Coba model lain.';
            } else if (error.name === 'TypeError' || errorMessage.includes('Failed to fetch') || errorMessage.includes('Could not resolve host')) {
                displayMessage = 'Sedang terjadi gangguan, periksa koneksi atau ganti menggunakan model lain.';
            } else {
                displayMessage = 'Server sedang mengalami gangguan.';
            }

            errorMessage = `<div class="error-message">${displayMessage}</div>`;

            aiMessageContent.innerHTML = errorMessage;
            chatDisplay.scrollTop = chatDisplay.scrollHeight;
        } finally {
            // Reset status after finishing processing
            isGenerating = false;
            updateSendButtonState();
        }
    }

    // Function to save memory to database
    async function saveMemory(user_input, ai_response, memory_id) {
        try {
            // Calculate token count
            const token_count = (user_input.split(/\s+/).length + ai_response.split(/\s+/).length) / 4; // Token count is roughly 4 characters per token

            const response = await fetch('../includes/memory/save_memory.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_input: user_input,
                    ai_response: ai_response,
                    token_count: Math.round(token_count),
                    memory_id: memory_id
                })
            });
            const result = await response.json();
            if (!result.success) {
                console.error('Failed to save memory:', result.error);
            }
        } catch (error) {
            console.error('Error saving memory:', error);
        }
    }

    // Function to add pin button to AI message container
    function addPinButtonToAIMessage(container, memoryId, isCore) {
        const pinButton = document.createElement('button');
        pinButton.classList.add('action-button', 'pin-button');
        pinButton.dataset.memoryId = memoryId;
        pinButton.dataset.isCore = isCore ? 'true' : 'false';
        pinButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-paperclip">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
        `;
        if (isCore) {
            pinButton.classList.add('pinned');
        }
        pinButton.title = isCore ? 'Lepas Pin' : 'Sematkan Topik';
        
        pinButton.addEventListener('click', async () => {
            const currentIsCore = pinButton.dataset.isCore === 'true';
            const newMemoryType = currentIsCore ? 'short' : 'core';
            try {
                const response = await fetch('../includes/memory/update_memory_type.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ memory_id: memoryId, memory_type: newMemoryType })
                });
                const result = await response.json();
                if (result.success) {
                    pinButton.dataset.isCore = newMemoryType === 'core' ? 'true' : 'false';
                    pinButton.classList.toggle('pinned', newMemoryType === 'core');
                    pinButton.title = newMemoryType === 'core' ? 'Lepas Pin' : 'Sematkan Memori';
                    console.log('Memory type updated:', result.message);
                } else {
                    console.error('Failed to update memory type:', result.error);
                }
            } catch (error) {
                console.error('Error updating memory type:', error);
            }
        });
        container.appendChild(pinButton);
    }

    // Function to add copy button to AI message container
    function addCopyButtonToAIMessage(container, messageContentElement) {
        const copyButton = document.createElement('button');
        copyButton.classList.add('action-button', 'copy-message-button');
        copyButton.title = 'Salin Pesan';
        copyButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-copy">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
        `;

        copyButton.addEventListener('click', () => {
            const textToCopy = messageContentElement.textContent; // Mengambil teks dari konten pesan
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    showCopySuccess(copyButton);
                }).catch(err => {
                    fallbackCopyText(textToCopy, copyButton);
                });
            } else {
                fallbackCopyText(textToCopy, copyButton);
            }
        });
        container.appendChild(copyButton);
    }
    
    // Function to add expand button to AI message container
    function addExpandButtonToAIMessage(container, messageContentElement) {
        const expandButton = document.createElement('button');
        expandButton.classList.add('action-button', 'expand-message-button');
        expandButton.title = 'Tampilkan Penuh';
        expandButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-maximize-2">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
        `;

        expandButton.addEventListener('click', () => {
            showMessageInOverlay(messageContentElement);
        });
        container.appendChild(expandButton);
    }
    
    // Function to show message in overlay
    function showMessageInOverlay(messageContentElement) {
        // Check if overlay exists, if not create it
        let overlay = document.querySelector('.message-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.classList.add('message-overlay');
            document.body.appendChild(overlay);
        }
        
        // Clear overlay content before showing new message
        overlay.innerHTML = '';
        
        // Create overlay content
        const overlayContent = document.createElement('div');
        overlayContent.classList.add('overlay-content');
        
        // Add close/minimize button
        const closeButton = document.createElement('button');
        closeButton.classList.add('overlay-close');
        closeButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-minimize-2">
                <polyline points="4 14 10 14 10 20"></polyline>
                <polyline points="20 10 14 10 14 4"></polyline>
                <line x1="14" y1="10" x2="21" y2="3"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
        `;
        closeButton.title = 'Tutup';
        closeButton.addEventListener('click', () => {
            overlay.classList.remove('active');
            // Clear overlay content after animation
            setTimeout(() => {
                if (!overlay.classList.contains('active')) {
                    overlay.innerHTML = '';
                }
            }, 300);
        });
        
        // Create message content
        const messageContent = document.createElement('div');
        messageContent.classList.add('ai-message-content');
        messageContent.innerHTML = messageContentElement.innerHTML;
        
        // Stack elements
        overlayContent.appendChild(closeButton);
        overlayContent.appendChild(messageContent);
        overlay.appendChild(overlayContent);
        
        // Show overlay with animation
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });

        setTimeout(() => {
            const focusables = overlay.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusables.length) focusables[0].focus();
        }, 100);

        trapFocusInOverlay(overlay);
        
        // Add event listener to close overlay on outside click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                setTimeout(() => {
                    if (!overlay.classList.contains('active')) {
                        overlay.innerHTML = '';
                    }
                }, 300);
            }
        });
        
        // Add event listener to close overlay on Escape key press
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                overlay.classList.remove('active');
                setTimeout(() => {
                    if (!overlay.classList.contains('active')) {
                        overlay.innerHTML = '';
                    }
                }, 300);
                document.removeEventListener('keydown', escHandler);
            }
        });
    }

    // Event listener for model selection button
    if (modelSelectButton) modelSelectButton.addEventListener('click', toggleModelDropdown);
    document.addEventListener('click', e => {
        if (!modelSelectButton?.contains(e.target) && !modelDropdownContent?.contains(e.target)) {
            modelDropdownContent?.classList.remove('show');
            modelSelectButton?.classList.remove('active');
        }
    });

    // Event listener for send and stop button
    sendButton.addEventListener('click', () => {
        if (isRecording || isVoiceProcessing) {
            cancelVoiceProcessing(); // Cancel voice processing if active
        } else if (isGenerating) {
            cancelGeneration(); // Cancel AI generation if active
        } else {
            sendMessage(); // Send user message
        }
    });

    if (userInput) {
        userInput.addEventListener('input', autoResizeTextarea);
        userInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // Send message with enter button if not generating, recording, or processing voice
                if (!isGenerating && !isRecording && !isVoiceProcessing) {
                    sendMessage();
                }
            }
        });
    }

    // Event listener for copy button click
    document.addEventListener('click', (e) => {
        if (e.target.closest('.copy-button')) { // This is for copy button within code block
            const button = e.target.closest('.copy-button');
            const codeBlock = button.closest('.code-block-container').querySelector('code');
            const textToCopy = codeBlock.textContent;

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    showCopySuccess(button);
                }).catch(err => {
                    fallbackCopyText(textToCopy, button);
                });
            } else {
                fallbackCopyText(textToCopy, button);
            }
        }
    });

    // Event listener for mobile device copy button
    function fallbackCopyText(text, button) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showCopySuccess(button);
            } else {
                console.warn('Perintah salin fallback gagal');
            }
        } catch (err) {
            console.error('Kesalahan salin fallback:', err);
        }

        document.body.removeChild(textarea);
    }

    // Function to show copy success message
    function showCopySuccess(button) {
        const originalHTML = button.innerHTML;
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
        setTimeout(() => {
            button.innerHTML = originalHTML;
        }, 2000);
    }

    // Function to load chat history from database
    async function loadChatHistory() {
        try {
            const response = await fetch('../includes/memory/get_chat_history.php');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            // Delete default AI message
            chatDisplay.innerHTML = '';

            if (data.success && data.history && data.history.length > 0) {
                data.history.forEach(chat => {
                    addMessage('user', chat.user_input);
                    addMessage('ai', chat.ai_response, chat.memory_id, chat.memory_type === 'core');
                });
            } else {
                // If history is empty, add default AI message
                addMessage('ai', 'Halo! Saya adalah asisten virtual Anda, ada yang bisa saya bantu?');
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
            // If there's an error loading history, show default AI message
            chatDisplay.innerHTML = ''; // Clear display
            addMessage('ai', 'Halo! Saya adalah asisten virtual Anda, ada yang bisa saya bantu?');
        }
    }

    // Trap focus within overlay
    function trapFocusInOverlay(overlayElement) {
        const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

        overlayElement.addEventListener('keydown', e => {
            if (e.key !== 'Tab') return;
            const focusables = overlayElement.querySelectorAll(focusableSelectors);
            if (focusables.length === 0) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                // Tab
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });
    }

    // Initialization
    await loadAvailableModels();
    await loadChatHistory(); // Call function to load chat history
    autoResizeTextarea();
});
