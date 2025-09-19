const chatContainer = document.getElementById('chatContainer');
const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const fileInput = document.getElementById('fileInput');
const fileNameDisplay = document.getElementById('fileName');

// Show selected file name
fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    fileNameDisplay.textContent = fileInput.files[0].name;
  } else {
    fileNameDisplay.textContent = '';
  }
});


// Scroll chat container to bottom
function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#039;';
      default:
        return m;
    }
  });
}

// Simple Markdown parser for bold, italics, inline code, code blocks, and links
function markdownToHtml(text) {
  // Escape first
  let html = escapeHtml(text);

  // Code blocks (```lang\ncode\n```)
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Inline code (`code`)
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // Bold (**text** or __text__)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Italics (*text* or _text_)
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');

  // Links [text](url)
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // New lines to <br>
  html = html.replace(/\n/g, '<br>');

  return html;
}

// Append a message from user or AI (no typing animation)
function appendMessage(sender, text) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);

  // Apply markdown + preserve line breaks
  msg.innerHTML = markdownToHtml(text);

  // Add copy button
  addCopyButton(msg);

  chatContainer.appendChild(msg);
  chatContainer.classList.remove('center');
  scrollToBottom();
}

// Append AI message with typing animation
async function appendTypingMessage(text) {
  const msg = document.createElement('div');
  msg.classList.add('message', 'ai', 'typing');
  chatContainer.appendChild(msg);
  chatContainer.classList.remove('center');
  scrollToBottom();

  let displayedText = '';
  for (let i = 0; i < text.length; i++) {
    displayedText += escapeHtml(text.charAt(i));
    msg.innerHTML = markdownToHtml(displayedText);
    scrollToBottom();

    // Slow down for shorter text, speed up for longer
    const delay = text.length > 1000 ? 1 : 15;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  msg.classList.remove('typing');
  addCopyButton(msg);
}

// Add a copy button to a message div
function addCopyButton(msgDiv) {
  const copyBtn = document.createElement('button');
  copyBtn.classList.add('copy-btn');
  copyBtn.title = 'Copy message';
  copyBtn.innerText = '📋';
  copyBtn.addEventListener('click', () => {
    // Copy text content without markdown tags
    const tempText = msgDiv.innerText;
    navigator.clipboard.writeText(tempText);
    copyBtn.innerText = '✅';
    setTimeout(() => (copyBtn.innerText = '📋'), 1500);
  });
  msgDiv.appendChild(copyBtn);
}

// Auto-resize textarea on input
userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = `${userInput.scrollHeight}px`;
});

// On submit
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const prompt = userInput.value.trim();
  const file = fileInput.files[0];

  if (!prompt && !file) return; // Require either prompt or file

  appendMessage('user', prompt || '[Sent an image]');

  userInput.value = '';
  userInput.style.height = 'auto';
  fileInput.value = '';
  fileNameDisplay.textContent = '';

  function appendHtmlMessage(sender, htmlContent) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);

  msg.innerHTML = htmlContent;

  // Add copy button only for text messages (optional: skip for images)
  // addCopyButton(msg);  // you can skip for image messages

  chatContainer.appendChild(msg);
  chatContainer.classList.remove('center');
  scrollToBottom();
}

  // Loading indicator
  const loadingMsg = document.createElement('div');
  loadingMsg.classList.add('message', 'loading');
  loadingMsg.innerHTML = '<span></span>';
  chatContainer.appendChild(loadingMsg);
  scrollToBottom();

  try {
    let data;
    if (file) {
      // Send multipart/form-data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('prompt', prompt);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      data = await res.json();

      loadingMsg.remove();

      if (data.output) {
        appendHtmlMessage('ai', `
  🖼️ <br>
  <div class="img-preview-wrapper">
    <img src="${data.fileUrl}" class="preview-image" />
    <div class="img-hover-zoom">
      <img src="${data.fileUrl}" />
    </div>
  </div>
`);
await appendTypingMessage(data.output);

        await appendTypingMessage(data.output);
      } else {
        appendMessage('ai', "❌ Failed to process image.");
      }
    } else {
      // Send JSON prompt only
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      data = await res.json();

      loadingMsg.remove();

      if (data.output) {
        await appendTypingMessage(data.output);
      } else {
        appendMessage('ai', "Sorry, I couldn't generate a response.");
      }
    }
  } catch (err) {
    console.error(err);
    loadingMsg.remove();
    appendMessage('ai', 'An error occurred while connecting to the AI server.');
  }
});
