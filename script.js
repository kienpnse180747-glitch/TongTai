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
        return;
    }

    if (nameInput) {
        // Hỗ trợ tối đa cho điện thoại: chạm vào là lập tức focus và bật bàn phím
        nameInput.addEventListener("touchstart", (e) => {
            e.stopPropagation();
            nameInput.focus();
        }, { passive: true });

        nameInput.addEventListener("click", (e) => {
            e.stopPropagation();
            nameInput.focus();
        });

        nameInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                if (startBtn) startBtn.click();
            }
        });
    }

    if (startBtn) {
        let isSubmitting = false;
        const handleStart = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (isSubmitting) return;

            const nameVal = nameInput ? nameInput.value.trim() : "";
            if (nameVal) {
                isSubmitting = true;
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
                alert("Em hãy nhập tên để Ahn Khánh Huy biết nhé!");
                if (nameInput) nameInput.focus();
            }
        };

        startBtn.onclick = handleStart;
        startBtn.addEventListener("touchend", (e) => {
            e.preventDefault();
            handleStart(e);
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
const DEFAULT_API_KEY = "AQ.Ab8RN6Lys5s1m2-54dtTJ1BmRPf-3OxV_HzFYEaaSElwxDKVJA";
function getActiveApiKey() {
    return (localStorage.getItem('geminiApiKey') || DEFAULT_API_KEY).trim();
}

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

// Kịch bản trò chuyện thông minh không bao giờ bị lặp lại (dành cho chế độ dự phòng và khi API key gặp lỗi)
function getFallbackResponse(userText) {
    const textLower = (userText || "").toLowerCase().trim();
    const name = playerName || "em";

    // 1. Chào hỏi
    if (textLower.match(/^(chào|hi|hello|ê|alo|anh ơi|chồng ơi)/)) {
        const greetings = [
            `[DIU_DANG] Anh đây ${name}. Hôm nay ở nhà có nhớ anh không?`,
            `[VUI] Bà xã gọi anh có chuyện gì thế? Nhớ chồng rồi à?`,
            `[BINH_THUONG] Ừ, anh nghe đây. Hôm nay em làm những gì rồi?`
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }

    // 2. Tình cảm, nhớ nhung, yêu thương
    if (textLower.match(/nhớ|yêu|thương|ôm|hôn|thích anh|bên anh/)) {
        const love = [
            `[VUI] Miệng ngọt ngào như vậy... Đợi tối nay anh về, lại đây anh ôm nào.`,
            `[DIU_DANG] Anh cũng nhớ ${name} phát điên lên được. Muốn bỏ hết việc về với em ngay thôi.`,
            `[DIU_DANG] Biết nói lời ngọt ngào thế này từ bao giờ đấy? Làm tim anh đập loạn nhịp rồi.`
        ];
        return love[Math.floor(Math.random() * love.length)];
    }

    // 3. Ăn uống, đói, cơm
    if (textLower.match(/ăn|đói|cơm|trưa|tối|uống|trà sữa|nấu/)) {
        const food = [
            `[DIU_DANG] Em đã ăn gì chưa? Đừng có mải làm mà nhịn đói, anh xót đấy.`,
            `[VUI] Tối nay em muốn ăn món gì? Anh đặt bàn nhà hàng em thích nhất nhé.`,
            `[BINH_THUONG] Thẻ đen anh đưa em đâu rồi, thích ăn gì cứ gọi thỏa thích, đừng tiết kiệm cho anh.`
        ];
        return food[Math.floor(Math.random() * food.length)];
    }

    // 4. Mệt mỏi, bận rộn, công việc
    if (textLower.match(/mệt|bận|áp lực|chán|khó chịu|sếp|đồng nghiệp/)) {
        const work = [
            `[DIU_DANG] Ai dám làm ${name} của anh mệt mỏi? Nghỉ việc đi, Ahn Khánh Huy này nuôi em cả đời.`,
            `[DIU_DANG] Lại đây tựa vào vai anh. Bao nhiêu giông bão ngoài kia cứ để chồng gánh hết cho em.`,
            `[TUC_GIAN] Kẻ nào dám làm vợ anh phải phiền lòng? Nói tên ra xem nào.`
        ];
        return work[Math.floor(Math.random() * work.length)];
    }

    // 5. Đi chơi, mua sắm, tiền, thẻ
    if (textLower.match(/đi chơi|mua sắm|shopping|tiền|thẻ|mua đồ|quần áo/)) {
        const shopping = [
            `[VUI] Thẻ đen phụ của anh em cứ quẹt hết hạn mức đi. Miễn ${name} vui là được.`,
            `[DIU_DANG] Cuối tuần này anh gác hết lịch họp đưa em đi du lịch nhé? Em muốn đi đâu?`
        ];
        return shopping[Math.floor(Math.random() * shopping.length)];
    }

    // 6. Giận dỗi, xin lỗi
    if (textLower.match(/giận|dỗi|xin lỗi|hờn|đừng giận|tha lỗi/)) {
        const sulk = [
            `[TUC_GIAN] Em nghĩ một câu xin lỗi là xong sao? Tối nay phạt em ôm anh ngủ cả đêm.`,
            `[DIU_DANG] Làm sao anh nỡ giận ${name} của anh lâu được chứ. Lại đây anh dỗ nào.`
        ];
        return sulk[Math.floor(Math.random() * sulk.length)];
    }

    // 7. Hỏi đang làm gì, ở đâu, khi nào về
    if (textLower.match(/làm gì|ở đâu|khi nào về|mấy giờ về|về chưa/)) {
        const where = [
            `[BINH_THUONG] Anh vừa duyệt xong hợp đồng ở tập đoàn. Tầm 30 phút nữa là anh có mặt ở nhà với em rồi.`,
            `[DIU_DANG] Anh đang trên xe về rồi. Ngoan ngoãn ở nhà đợi chồng nhé.`
        ];
        return where[Math.floor(Math.random() * where.length)];
    }

    // 8. Tự động ngẫu nhiên các câu thoại tổng tài hấp dẫn đa dạng
    const randomPool = [
        `[DIU_DANG] Nói rõ hơn đi bà xã, hôm nay có chuyện gì muốn tâm sự với anh à?`,
        `[VUI] Chỉ cần là chuyện của em, dù nhỏ nhặt đến đâu anh cũng muốn lắng nghe hết.`,
        `[BINH_THUONG] Nghe giọng em là anh thấy bao nhiêu căng thẳng ở công ty tan biến hết.`,
        `[DIU_DANG] ${name} ngoan nào, muốn gì cứ nói với anh, trên đời này không có thứ gì anh không cho em được.`,
        `[TUC_GIAN] Lại mải nghịch điện thoại không chịu nghỉ ngơi đúng không? Coi chừng anh tịch thu điện thoại đấy.`,
        `[VUI] Nhìn em nhắn tin là anh biết em đang cười tủm tỉm rồi. Dễ thương thế này làm sao anh rời mắt được.`
    ];

    return randomPool[Math.floor(Math.random() * randomPool.length)];
}

function getFallbackPhotoResponse() {
    const responses = [
        `[VUI] Vợ anh lúc nào cũng xinh đẹp thế này, làm sao anh tập trung ký hợp đồng được đây?`,
        `[DIU_DANG] Bức ảnh này đẹp lắm. Nhưng em ở ngoài đời còn quyến rũ hơn gấp trăm lần.`,
        `[BINH_THUONG] Anh lưu vào máy rồi. Em chụp góc nào cũng làm tim anh rung động.`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

function getFallbackVoiceResponse() {
    const name = playerName || "em";
    const responses = [
        `[DIU_DANG] Giọng nói ngọt ngào của ${name} làm tan chảy hết mệt mỏi của anh rồi.`,
        `[VUI] Giọng em nghe đáng yêu thế này, tối nay về phải nói cho anh nghe cả đêm nhé.`,
        `[DIU_DANG] Anh nghe rõ rồi. Giọng vợ anh nghe êm tai nhất trần đời.`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

// Hàm lưu trữ đồng bộ cả bộ nhớ AI và giao diện chat
function saveMemory() {
    localStorage.setItem('aiMemory', JSON.stringify(conversationHistory));
    localStorage.setItem('chatUI', chatHistory.innerHTML);
}

// Hàm gọi Gemini API tích hợp bộ nhớ lịch sử, tính cách và gửi đa phương thức (Ảnh/Voice)
async function callRealAI(userText, base64Data = null, mimeType = null) {
    const currentName = playerName || "em";
    const systemInstruction = `Bạn là Ahn Khánh Huy, một tổng tài lạnh lùng nhưng cực kỳ sủng ái vợ (tên là ${currentName}). Người đang chat với bạn chính là ${currentName}.
  Hãy trả lời tin nhắn thật ngôn tình, tự nhiên và ngắn gọn (1-2 câu). Dựa vào các câu chuyện trước đó để phản hồi hợp lý.
  BẮT BUỘC mở đầu câu trả lời bằng ĐÚNG 1 trong 4 thẻ: [BINH_THUONG], [VUI], [TUC_GIAN], hoặc [DIU_DANG].`;

    const activeKey = getActiveApiKey();
    if (!activeKey || activeKey === "YOUR_API_KEY") {
        throw new Error("Chưa cấu hình API Key hợp lệ");
    }

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

    // Thử lần lượt các model phổ biến của Gemini
    const candidateModels = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash", "gemini-3.5-flash-lite"];
    let lastError = null;

    for (const model of candidateModels) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(activeKey)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': activeKey
                },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemInstruction }] },
                    contents: conversationHistory
                })
            });

            const data = await response.json();
            if (data.error) {
                lastError = data.error;
                continue;
            }

            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                const aiText = data.candidates[0].content.parts[0].text;
                conversationHistory.push({
                    role: "model",
                    parts: [{ text: aiText }]
                });
                saveMemory();
                return aiText;
            }
        } catch (err) {
            lastError = err;
        }
    }

    throw lastError || new Error("Không thể kết nối Gemini API");
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

    // Tự động nhận diện nếu người dùng dán trực tiếp API Key vào ô chat
    if (text.startsWith("AIzaSy") || (text.startsWith("AQ.") && text.length > 25)) {
        localStorage.setItem('geminiApiKey', text);
        appendUserMessage("🔑 <em>Cập nhật Google Gemini API Key mới</em>");
        inputField.value = '';
        appendAIMessage("[VUI] Anh đã cập nhật API Key mới rồi nhé bà xã! Từ bây giờ anh sẽ trò chuyện trực tiếp bằng AI với em.");
        return;
    }

    // 1. In tin nhắn User
    appendUserMessage(text);
    inputField.value = '';
    isTyping = true;

    // 2. Kích hoạt hiệu ứng đang trả lời
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message';
    typingDiv.innerHTML = '<strong>Ahn Khánh Huy:</strong> <em>Đang gõ...</em>';
    chatHistory.appendChild(typingDiv);
    scrollToBottom();

    try {
        // Gửi text cho AI và chờ nhận kết quả
        const aiResponse = await callRealAI(text);
        if (typingDiv.parentNode) typingDiv.parentNode.removeChild(typingDiv);

        // Gọi hàm xử lý chung vừa tạo
        processAIResponse(aiResponse);
    } catch (error) {
        console.warn("Lỗi gọi Gemini API (sử dụng phản hồi thông minh):", error);
        if (typingDiv.parentNode) typingDiv.parentNode.removeChild(typingDiv);
        const fallback = getFallbackResponse(text);
        processAIResponse(fallback);
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
            typingDiv.innerHTML = '<strong>Ahn Khánh Huy:</strong> <em>Đang xem ảnh...</em>';
            chatHistory.appendChild(typingDiv);
            scrollToBottom();

            // 3. Gửi ảnh lên AI
            try {
                const aiResponse = await callRealAI("Anh thấy bức ảnh này thế nào?", base64String, file.type);
                if (typingDiv.parentNode) typingDiv.parentNode.removeChild(typingDiv);

                // Xử lý đổi ảnh nhân vật và hiệu ứng gõ chữ
                processAIResponse(aiResponse);
            } catch (error) {
                console.warn("Lỗi gửi ảnh lên AI (sử dụng phản hồi thông minh):", error);
                if (typingDiv.parentNode) typingDiv.parentNode.removeChild(typingDiv);
                const fallback = getFallbackPhotoResponse();
                processAIResponse(fallback);
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
        typingDiv.innerHTML = '<strong>Ahn Khánh Huy:</strong> <em>Đang nghe tin nhắn thoại...</em>';
        chatHistory.appendChild(typingDiv);
        scrollToBottom();

        // 3. Gửi Voice lên AI (Tái sử dụng hàm callRealAI)
        try {
            // Truyền định dạng audioBlob.type vào để Gemini biết đây là âm thanh
            const aiResponse = await callRealAI("Anh nghe đoạn ghi âm này và trả lời em nhé.", base64String, audioBlob.type);
            if (typingDiv.parentNode) typingDiv.parentNode.removeChild(typingDiv);

            processAIResponse(aiResponse);
        } catch (error) {
            console.warn("Lỗi gửi voice lên AI (sử dụng phản hồi thông minh):", error);
            if (typingDiv.parentNode) typingDiv.parentNode.removeChild(typingDiv);
            const fallback = getFallbackVoiceResponse();
            processAIResponse(fallback);
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
    nameStrong.innerText = 'Ahn Khánh Huy:';
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

const apiKeyBtn = document.getElementById('api-key-btn');
if (apiKeyBtn) {
    apiKeyBtn.addEventListener('click', () => {
        const currentKey = localStorage.getItem('geminiApiKey') || "";
        const enteredKey = prompt(
            "Nhập Google Gemini API Key của bạn (miễn phí tại https://aistudio.google.com/apikey):",
            currentKey
        );
        if (enteredKey !== null) {
            const trimmed = enteredKey.trim();
            if (trimmed) {
                localStorage.setItem('geminiApiKey', trimmed);
                alert("Đã lưu API Key thành công! Ahn Khánh Huy sẽ kết nối AI trực tiếp.");
            } else {
                localStorage.removeItem('geminiApiKey');
                alert("Đã xóa API Key tùy chỉnh. Trò chuyện chuyển về kịch bản tổng tài thông minh.");
            }
        }
    });
}
