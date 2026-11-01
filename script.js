let playerName = localStorage.getItem('playerName') || "";

function initSetupScreen() {
    const setupScreen = document.getElementById("setup-screen");
    const nameInput = document.getElementById("player-name-input");
    const startBtn = document.getElementById("start-game-btn");
    const bgMusic = document.getElementById("bg-music");

    // Nếu đã có tên từ lần chơi trước, ẩn và gỡ bỏ màn hình nhập tên
    if (playerName && setupScreen) {
        setupScreen.classList.add("hidden");
        setupScreen.style.display = "none";
        if (setupScreen.parentNode) setupScreen.parentNode.removeChild(setupScreen);
    }

    if (startBtn) {
        const handleStart = (e) => {
            if (e) e.preventDefault();
            const nameVal = nameInput ? nameInput.value.trim() : "";
            if (nameVal) {
                playerName = nameVal;
                localStorage.setItem('playerName', playerName); // Lưu lại tên
                
                // Ẩn và gỡ bỏ hoàn toàn màn hình nhập tên
                if (setupScreen) {
                    setupScreen.classList.add("hidden");
                    setupScreen.style.display = "none";
                    if (setupScreen.parentNode) setupScreen.parentNode.removeChild(setupScreen);
                }

                // Kích hoạt nhạc nền khi bắt đầu
                if (bgMusic) {
                    bgMusic.volume = 0.5; // Chỉnh âm lượng vừa phải (50%)
                    bgMusic.play().catch(err => console.log("Lỗi phát nhạc: ", err));
                }
            } else {
                alert("Em hãy nhập tên để Phó Tổng biết nhé!");
            }
        };

        startBtn.onclick = handleStart;
        startBtn.addEventListener("touchend", handleStart);
    }

    if (nameInput) {
        nameInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && startBtn) {
                startBtn.click();
            }
        });
    }
}

// Khởi chạy ngay lập tức nếu DOM đã có sẵn, hoặc khi DOMContentLoaded
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSetupScreen);
} else {
    initSetupScreen();
}

const inputField = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const chatHistory = document.getElementById('chat-history');
const charImg = document.getElementById('character-image');
const bgImg = document.getElementById('bg-image');

// Cấu hình Gemini API
const API_KEY = "AQ.Ab8RN6Lys5s1m2-54dtTJ1BmRPf-3OxV_HzFYEaaSElwxDKVJA";
let conversationHistory = JSON.parse(localStorage.getItem('aiMemory')) || [];

// Biến quản lý thu âm tin nhắn thoại
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// Bản đồ cảm xúc của AI sang ảnh nhân vật tương ứng
const characterImages = {
    "[BINH_THUONG]": "images/tong-tai-bthg.jpg.jpg",
    "[VUI]": "images/tong-tai-cuoi.jpg.jpg",
    "[TUC_GIAN]": "images/tong-tai-tuc.jpg.jpg",
    "[DIU_DANG]": "images/tong-tai-diu-dang.jpg.jpg"
};
const emotionImages = characterImages;

// Kịch bản trò chuyện dự phòng (Khi không có mạng hoặc chưa có API key)
const aiLogic = [
    {
        keywords: ["nhớ", "yêu", "thương", "ôm", "nhất"],
        response: "Miệng ngọt như vậy... Lại đây anh ôm nào.",
        newCharImage: "images/tong-tai-cuoi.jpg.jpg",
        newBgImage: null
    },
    {
        keywords: ["xin lỗi", "muộn", "quên", "sao chép"],
        response: "Chỉ xin lỗi suông thôi sao? Tối nay phạt em không được ra khỏi phòng.",
        newCharImage: "images/tong-tai-tuc.jpg.jpg",
        newBgImage: null
    },
    {
        keywords: ["bận", "công việc", "mệt", "sếp"],
        response: "Anh đã bảo em nghỉ việc về anh nuôi rồi cơ mà. Kẻ nào dám bắt nạt vợ anh?",
        newCharImage: "images/tong-tai-lanh-lung.jpg.jpg",
        newBgImage: null
    },
    {
        keywords: ["bạn", "đi chơi", "ăn", "mua sắm"],
        response: "Thẻ phụ của anh em mang theo chưa? Mua hết những gì em thích đi.",
        newCharImage: "images/tong-tai-diu-dang.jpg.jpg",
        newBgImage: null
    }
];

const defaultResponse = {
    response: "Nói rõ hơn đi. Hôm nay em có chuyện gì giấu anh đúng không?",
    newCharImage: "images/tong-tai-bthg.jpg.jpg",
    newBgImage: null
};

// Hàm lưu trữ đồng bộ cả bộ nhớ AI và giao diện chat
function saveMemory() {
    localStorage.setItem('aiMemory', JSON.stringify(conversationHistory));
    localStorage.setItem('chatUI', chatHistory.innerHTML);
}

// Hàm gọi Gemini API tích hợp bộ nhớ lịch sử, tính cách và gửi đa phương thức (Ảnh/Voice)
async function callRealAI(userText, base64Data = null, mimeType = null) {
    const currentName = playerName || "em";
    const systemInstruction = `Bạn là Phó Tổng, một tổng tài lạnh lùng nhưng cực kỳ sủng ái vợ (tên là ${currentName}). Người đang chat với bạn chính là ${currentName}.
  Hãy trả lời tin nhắn thật ngôn tình, tự nhiên và ngắn gọn (1-2 câu). Dựa vào các câu chuyện trước đó để phản hồi hợp lý.
  BẮT BUỘC mở đầu câu trả lời bằng ĐÚNG 1 trong 4 thẻ: [BINH_THUONG], [VUI], [TUC_GIAN], hoặc [DIU_DANG].`;

    let userParts = [{ text: userText }];
    if (base64Data) {
        userParts.push({
            inline_data: {
                mime_type: (mimeType || "image/jpeg").split(';')[0],
                data: base64Data
            }
        });
    }

    // Lưu tin nhắn mới nhất của người dùng vào bộ nhớ
    conversationHistory.push({
        role: "user",
        parts: userParts
    });
    saveMemory();

    // Gửi toàn bộ bối cảnh và lịch sử cho AI
    let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: conversationHistory
        })
    });

    let data = await response.json();

    // Dự phòng model thay thế nếu model chính quá tải
    if (data.error && (data.error.code === 503 || data.error.code === 404 || data.error.code === 429)) {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemInstruction }] },
                contents: conversationHistory
            })
        });
        data = await response.json();
    }

    if (data.error) {
        throw new Error(data.error.message || "Lỗi phản hồi từ Gemini API");
    }

    const aiText = data.candidates[0].content.parts[0].text;

    // Lưu câu trả lời của AI vào bộ nhớ để lần sau nó nhớ mạch truyện
    conversationHistory.push({
        role: "model",
        parts: [{ text: aiText }]
    });
    saveMemory();

    return aiText;
}

// Hàm bóc tách thẻ cảm xúc và hiển thị câu trả lời của AI
function processAIResponse(aiResponse) {
    let finalMsg = aiResponse;
    // Tìm thẻ cảm xúc có định dạng [TEXT] ở bất kỳ đâu trong câu trả lời
    let emotionMatch = finalMsg.match(/\[(.*?)\]/);

    if (emotionMatch) {
        const emotionTag = emotionMatch[0]; // Lấy ra ví dụ: [VUI]
        finalMsg = finalMsg.replace(emotionTag, '').trim(); // Xóa thẻ khỏi nội dung tin nhắn

        // Tự động đổi ảnh nếu thẻ khớp với bản đồ characterImages
        if (characterImages[emotionTag]) {
            const charImg = document.getElementById("character-image");
            if (charImg) {
                charImg.style.opacity = 0; // Làm mờ ảnh cũ
                setTimeout(() => {
                    charImg.src = characterImages[emotionTag]; // Đổi link ảnh mới
                    charImg.style.opacity = 1; // Hiện ảnh mới
                }, 400);
            }
        }
    }

    // Gọi hàm in tin nhắn ra màn hình
    appendAIMessage(finalMsg);
}

let isTyping = false;

async function handleSend() {
    // Dự phòng phát nhạc nếu chưa được kích hoạt
    const bgMusic = document.getElementById('bg-music');
    if (bgMusic && bgMusic.paused) {
        bgMusic.play().catch(() => { });
    }

    const text = inputField.value.trim();
    if (!text || isTyping) return;

    // 1. In tin nhắn User
    appendUserMessage(text);
    inputField.value = '';
    isTyping = true;

    // 2. Kích hoạt hiệu ứng đang trả lời
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message';
    typingDiv.innerHTML = '<strong>Phó Tổng:</strong> <em>Đang gõ...</em>';
    chatHistory.appendChild(typingDiv);
    scrollToBottom();

    try {
        // Gửi text cho AI và chờ nhận kết quả
        const aiResponse = await callRealAI(text);
        if (typingDiv.parentNode) typingDiv.parentNode.removeChild(typingDiv);

        // Gọi hàm xử lý chung vừa tạo
        processAIResponse(aiResponse);
    } catch (error) {
        console.error("Lỗi gửi tin nhắn: ", error);
        if (typingDiv.parentNode) typingDiv.parentNode.removeChild(typingDiv);
        appendAIMessage("Anh đang bận họp chút, lát anh nhắn lại nhé.");
        isTyping = false;
    }
}

// Kết nối nút Camera và xử lý gửi ảnh
const imageBtn = document.getElementById("image-btn");
const fileUpload = document.getElementById("file-upload");

if (imageBtn && fileUpload) {
    imageBtn.addEventListener("click", () => fileUpload.click());

    fileUpload.addEventListener("change", async function () {
        const file = this.files[0];
        if (!file) return;

        // Kích hoạt nhạc nền nếu chưa phát
        const bgMusic = document.getElementById('bg-music');
        if (bgMusic && bgMusic.paused) {
            bgMusic.play().catch(() => { });
        }

        const reader = new FileReader();
        reader.onload = async function (e) {
            const base64Data = e.target.result;
            const base64String = base64Data.split(',')[1]; // Cắt bỏ tiền tố để lấy mã lõi

            // 1. In ảnh lên khung chat của người chơi
            appendUserMessage(`Em gửi ảnh này: <br><img src="${base64Data}" style="max-width: 180px; border-radius: 8px; margin-top: 5px;">`);

            // 2. Kích hoạt hiệu ứng AI đang xem ảnh
            isTyping = true;
            const typingDiv = document.createElement('div');
            typingDiv.id = 'typing-indicator';
            typingDiv.className = 'message ai-message';
            typingDiv.innerHTML = '<strong>Phó Tổng:</strong> <em>Đang xem ảnh...</em>';
            chatHistory.appendChild(typingDiv);
            scrollToBottom();

            // 3. Gửi ảnh lên AI
            try {
                const aiResponse = await callRealAI("Anh thấy bức ảnh này thế nào?", base64String, file.type);
                if (typingDiv.parentNode) typingDiv.parentNode.removeChild(typingDiv);

                // Xử lý đổi ảnh nhân vật và hiệu ứng gõ chữ
                processAIResponse(aiResponse);
            } catch (error) {
                console.error("Lỗi gửi ảnh: ", error);
                if (typingDiv.parentNode) typingDiv.parentNode.removeChild(typingDiv);
                appendAIMessage("Ảnh bị lỗi rồi, em gửi lại anh xem nhé.");
                isTyping = false;
            }
        };
        reader.readAsDataURL(file);
        this.value = ''; // Xóa bộ nhớ input để có thể chọn lại cùng một ảnh
    });
}

// Xử lý gửi tin nhắn thoại (Voice)
const voiceBtn = document.getElementById("voice-btn");

if (voiceBtn) {
    voiceBtn.addEventListener("click", async () => {
        // Phát nhạc nền nếu chưa phát
        const bgMusic = document.getElementById('bg-music');
        if (bgMusic && bgMusic.paused) {
            bgMusic.play().catch(() => { });
        }

        if (!isRecording) {
            // Bắt đầu thu âm
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) audioChunks.push(event.data);
                };

                mediaRecorder.onstop = processAudioData; // Gọi hàm xử lý khi dừng

                mediaRecorder.start();
                isRecording = true;
                audioChunks = [];

                // Đổi nút sang màu đỏ để báo hiệu đang thu
                voiceBtn.style.color = "#ff4444";
                voiceBtn.style.transform = "scale(1.2)";
            } catch (err) {
                console.error("Lỗi truy cập micro: ", err);
                alert("Em cần cho phép truy cập Micro để gửi tin nhắn thoại nhé!");
            }
        } else {
            // Dừng thu âm
            mediaRecorder.stop();
            isRecording = false;

            // Trả giao diện nút về bình thường
            voiceBtn.style.color = "";
            voiceBtn.style.transform = "scale(1)";

            // Tắt hẳn micro để xóa biểu tượng chấm cam/xanh trên thiết bị
            if (mediaRecorder.stream) {
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }
        }
    });
}

function processAudioData() {
    // Trình duyệt tự quyết định định dạng (thường là audio/webm hoặc audio/mp4)
    const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
    const reader = new FileReader();

    reader.onload = async function (e) {
        const base64Data = e.target.result;
        const base64String = base64Data.split(',')[1];

        // 1. In đoạn ghi âm lên khung chat để người chơi nghe lại được
        appendUserMessage(`🎤 <em>Tin nhắn thoại</em> <br><audio controls src="${base64Data}" style="max-width: 100%; margin-top: 8px; height: 35px;"></audio>`);

        // 2. Hiện trạng thái AI đang nghe
        isTyping = true;
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'message ai-message';
        typingDiv.innerHTML = '<strong>Phó Tổng:</strong> <em>Đang nghe tin nhắn thoại...</em>';
        chatHistory.appendChild(typingDiv);
        scrollToBottom();

        // 3. Gửi Voice lên AI (Tái sử dụng hàm callRealAI)
        try {
            // Truyền định dạng audioBlob.type vào để Gemini biết đây là âm thanh
            const aiResponse = await callRealAI("Anh nghe đoạn ghi âm này và trả lời em nhé.", base64String, audioBlob.type);
            if (typingDiv.parentNode) typingDiv.parentNode.removeChild(typingDiv);

            processAIResponse(aiResponse);
        } catch (error) {
            console.error("Lỗi gửi voice: ", error);
            if (typingDiv.parentNode) typingDiv.parentNode.removeChild(typingDiv);
            appendAIMessage("Tín hiệu kém quá, anh không nghe rõ. Em nói lại được không?");
            isTyping = false;
        }
    };

    reader.readAsDataURL(audioBlob);
}

function appendUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'message user-message';
    div.innerHTML = text;
    chatHistory.appendChild(div);
    scrollToBottom();
    saveMemory(); // Lưu ngay khi người chơi vừa gửi chữ
}

function appendAIMessage(text) {
    const div = document.createElement('div');
    div.className = 'message ai-message';

    const nameStrong = document.createElement('strong');
    nameStrong.innerText = 'Phó Tổng:';
    div.appendChild(nameStrong);

    const textSpan = document.createElement('span');
    textSpan.className = 'ai-text';
    div.appendChild(textSpan);
    chatHistory.appendChild(div);

    // Hiệu ứng Typewriter gõ từng chữ
    let i = 0;
    const speed = 40; // Tốc độ gõ

    function typeWriter() {
        if (i < text.length) {
            textSpan.innerHTML += text.charAt(i);
            const typeSound = document.getElementById('type-sound');
            if (typeSound) {
                typeSound.currentTime = 0;
                typeSound.play().catch(() => { });
            }
            i++;
            scrollToBottom();
            setTimeout(typeWriter, speed);
        } else {
            isTyping = false;
            saveMemory(); // Lưu lịch sử sau khi AI gõ xong
        }
    }
    typeWriter();
}

function scrollToBottom() {
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

sendBtn.addEventListener('click', handleSend);
inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});

// Khôi phục giao diện khi tải lại trang (F5)
window.onload = () => {
    const savedChatUI = localStorage.getItem('chatUI');
    if (savedChatUI) {
        chatHistory.innerHTML = savedChatUI;
        scrollToBottom();
    }
};

const resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        const isConfirm = confirm("Bạn có chắc muốn chơi lại từ đầu? Toàn bộ trí nhớ của AI về đoạn chat này sẽ bị xóa sạch.");
        if (isConfirm) {
            localStorage.clear(); // Xóa sạch bộ nhớ bao gồm cả tên
            location.reload();    // Tải lại trang web
        }
    });
}
