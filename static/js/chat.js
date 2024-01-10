const inputText = document.getElementById('input-text');
const formChat = document.getElementById('form-chat');
const messageContainer = $('#message');

let sender;
let receiver;
let roomID;

let cursor = null;
let perPage = 30; // 페이지당 보여줄 메시지 수

/////////////////////////////////////////////////////////

let socket = io();
socket.on('news', function (data) {
    console.log(data);
    socket.emit('my other event', {
        my: 'data'
    });
});

/////////////////////////////////////////////////////////

// 맨 위 메시지로 스크롤 애니메이션
$('#upward').on('click', function() {
    $('.chat').animate({ scrollTop: 0 }, 'slow');
});

// 맨 아래 메시지로 스크롤 애니메이션
$('#downward').on('click', function() {
    let $chat = $('.chat');
    $chat.animate({ scrollTop: $chat[0].scrollHeight }, 'slow');
});

// focus 이벤트가 발생했을 때
inputText.addEventListener('focus', function() {
    this.removeAttribute('placeholder');
});

// blur 이벤트가 발생했을 때
inputText.addEventListener('blur', function() {
    this.setAttribute('placeholder', '타인에 대한 존중과 배려를 지켜 주세요!');
});

// 날짜 비교
function compareDatesWithoutTime(dateA, dateB) {
    return dateA.getFullYear() === dateB.getFullYear() &&
           dateA.getMonth() === dateB.getMonth() &&
           dateA.getDate() === dateB.getDate();
}

// 날짜 라벨
function createDateLabel(date, prepend = false) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateLabel = $('<div>').addClass('date-label').text(date.toLocaleDateString('ko-KR', options));
    
    if (prepend) {
        messageContainer.prepend(dateLabel);
    } else {
        messageContainer.append(dateLabel);
    }
}

// 메시지 표시
function createMessageBox(message, sender, messageLine) {
    let messageBox;

    if (message.type === 'text') {
        messageBox = $('<div>').addClass('received-text-message').text(message.message);

        if (message.sender === sender) {
            messageBox.removeClass('received-text-message').addClass('sent-text-message');
            messageBox.css('display', 'inline-block');
            messageLine.css('text-align', 'right');
        } else {
            messageBox.css('display', 'inline-block');
        }

    } else if (message.type === 'image') {
        const imgElement = document.createElement('img');
        imgElement.src = message.message; // 이미지 경로 설정
        imgElement.classList.add('uploaded-image');

        const imgWrapper = $('<div>').addClass('image-wrapper'); // 외부 div 생성
        imgWrapper.append(imgElement); // 이미지를 외부 div 안에 추가

        imgElement.onclick = function() {
            window.open(this.src); // 이미지 클릭 시 이미지 주소를 새 창으로 열기
        };

        messageBox = $('<div>').addClass('received-image-message').append(imgWrapper);

        if (message.sender === sender) {
            messageBox.removeClass('received-image-message').addClass('sent-image-message');
            messageBox.css('display', 'inline-block');
            messageLine.css('text-align', 'right');
        } else {
            messageBox.css('display', 'inline-block');
        }

    }

    return messageBox;
}

// 메시지 시간 표시
function createAndAppendDateBox(date) {
    const options = { hour: '2-digit', minute: '2-digit' };
    const formattedDate = new Date(date).toLocaleString('ko-KR', options);
    const dateBox = $('<div>').addClass('dateBox').text(formattedDate);

    return dateBox;
}

// 이미지 출력
function displayImages(imagePaths) {
    const messageLine = $('<div>').addClass('message-line');

    imagePaths.forEach(imagePath => {
        const imgElement = document.createElement('img');
        imgElement.src = imagePath;
        imgElement.classList.add('uploaded-image');

        const imgWrapper = $('<div>').addClass('image-wrapper');
        imgWrapper.append(imgElement);

        imgElement.onclick = function() {
            window.open(this.src);
        };

        const messageBox = $('<div>').addClass('received-image-message').append(imgWrapper);
        messageBox.removeClass('received-image-message').addClass('sent-image-message');
        messageBox.css('display', 'inline-block');
        messageLine.css('text-align', 'right');

        const dateBox = createAndAppendDateBox(new Date());
        
        socket.emit('loadNewestMessage', { roomID: roomID });

        messageLine.append(messageBox, dateBox);
        messageContainer.append(messageLine);

        $('.chat').animate({ scrollTop: $('.chat')[0].scrollHeight }, 'slow');
    });
}

// 이미지 업로드
function uploadImages(images) {
    const formData = new FormData();
    const xhr = new XMLHttpRequest();

    formData.append('roomID', roomID);
    formData.append('sender', sender);
    formData.append('receiver', receiver);

    for (let i = 0; i < images.length; i++) {
        formData.append('imgs', images[i]);
    }

    xhr.open('POST', '/upload', true);

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            displayImages(data.imagePaths); // 이미지를 표시하는 함수 호출
        } else {
            // 오류 응답 처리
            const errorMessage = xhr.responseText;
            displayErrorMessage(errorMessage); // 사용자에게 오류 메시지 표시
        }
    };

    xhr.send(formData);
}

// DB에서 해당 방(room)의 가장 오래된 메시지를 가져온 후 최상단에 날짜 라벨 생성
// 채팅방 최초 접속 시에만 작동
socket.on('oldestMessage', (data) => {
    oldestMessageDate = new Date(data.oldestMessageDate);
    oldestMessageDate.setHours(0, 0, 0, 0); // 시간 정보를 0으로 설정하여 시간을 무시
    
    createDateLabel(oldestMessageDate, true);
});

// DB에서 해당 방(room)의 가장 최신 메시지를 가져온 후 현재와 날짜 비교
// 날짜가 다를 때만 날짜 라벨 생성
socket.on('newestMessage', (data) => {
    newestMessageDate = new Date(data.newestMessageDate);
    newestMessageDate.setHours(0, 0, 0, 0); // 시간 정보를 0으로 설정하여 시간을 무시

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if(!compareDatesWithoutTime(now, newestMessageDate)) {
        createDateLabel(newestMessageDate);
    }
});

// 에러 표시 (json)
function displayErrorMessage(errorMessage) {
    if (confirm(errorMessage + "\n페이지를 새로고침하시겠습니까?")) {
        location.reload();
    }
}

// 에러 표시 (socket)
socket.on('errorOccurred', (errorMessage) => {
    if (confirm(errorMessage + "\n페이지를 새로고침하시겠습니까?")) {
        location.reload();
    }
});

/////////////////////////////////////////////////////////

// 채팅방 입장
document.addEventListener('DOMContentLoaded', function() {
    const chat = document.querySelector('.chat');
    const send = document.querySelector('.send');

    function adjustChatHeight() {
        const sendHeight = send.offsetHeight;
        chat.style.bottom = sendHeight + 'px';
    }

    adjustChatHeight(); // 페이지 로드 시 높이 조절

    // 창 크기가 변경될 때 높이 재조정
    window.addEventListener('resize', () => {
        adjustChatHeight();
    });

    // 아이디 입력
    const askUserID = () => {
        sender = window.prompt("수신자 아이디를 입력하세요.");
        console.log(sender);

        receiver = window.prompt("송신자 아이디를 입력하세요.");
        console.log(receiver);

        // 아이디를 서버로 전달
        socket.emit("LOGIN", sender, receiver, (res) => {
            console.log(res);
        });
    };

    askUserID();

    document.getElementById('receiver').innerText = receiver;
});


// 채팅방 입장 시 이전 대화 내역 출력
socket.on('GET', (messages) => {

    // 이전 날짜 라벨을 기억하기 위한 변수
    let prevMessageDate;
    
    // 대화 내역이 있는 경우
    if (messages.length > 0) {

        // 페이지 로드 시 초기 cursor 설정
        if (!cursor) {
            const oldestMessageTime = messages[messages.length - 1].created_at;
            cursor = oldestMessageTime; // 초기 cursor 설정
            console.log(cursor);
        }

        messages.forEach((message, index) => {
            const messageLine = $('<div>').addClass('message-line');

            const date = new Date(message.created_at);
            const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()); // 시간 정보 제외한 날짜 정보만 가지도록 설정

            // 이전 메시지와 현재 메시지의 날짜가 다를 경우에만 날짜 라벨 추가
            if (!prevMessageDate || prevMessageDate.getTime() !== messageDate.getTime()) {
                const formattedDate = messageDate.toLocaleString('ko-KR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const dateLabel = $('<div>').addClass('date-label').text(formattedDate);
                messageContainer.append(dateLabel); // 날짜 라벨 삽입
                prevMessageDate = messageDate;
            }

            const messageBox = createMessageBox(message, sender, messageLine);
            const dateBox = createAndAppendDateBox(date);
                
            messageLine.append(messageBox, dateBox);
            messageContainer.append(messageLine);

            // 모든 메시지를 처리한 후에 스크롤을 맨 아래로 이동
            if (index === messages.length - 1) {
                const systemMessage = $('<div>').addClass('system-label').text('대화가 시작되었습니다.');
                messageContainer.append(systemMessage);
            }
        });

        // 초기 메시지 중 가장 오래된 메시지의 날짜 데이터 추출
        oldestMessageTime = messages[messages.length - perPage].created_at;

    } else {
        // 대화 내역이 없는 경우
        const systemMessage = $('<div>').addClass('system-label').text('대화가 시작되었습니다.');
        messageContainer.append(systemMessage);

        oldestMessageTime = null;
    }

    $('.chat').scrollTop($('.chat')[0].scrollHeight);
});

// '이전 대화 불러오기' 버튼 클릭
$('#loadPreviousMessages').click(() => {
    socket.emit('loadPreviousMessages', { roomID: roomID, cursor: cursor });
});

socket.on('previousMessages', (previousMessages) => {

    // 불러온 메시지 중 가장 최신 메시지의 날짜 데이터 추출
    lastMessageTime = previousMessages[0].created_at;

    oldestMessageDate = new Date(oldestMessageTime);
    lastMessageDate = new Date(lastMessageTime);

    // 연도, 월, 일을 비교하여 같은지 확인
    const isSameDate = compareDatesWithoutTime(oldestMessageDate, lastMessageDate);

    if (isSameDate) {
        $('.date-label:first').remove();
    }

    let prevMessageDate = null; // 이전 메시지의 날짜를 저장하는 변수

    previousMessages.forEach((message) => {
        const messageLine = $('<div>').addClass('message-line');

        const currentMessageDate = new Date(message.created_at);
    
        if (prevMessageDate) {
            // 이전 메시지와 현재 메시지의 날짜를 비교할 수 있음
            if (!compareDatesWithoutTime(prevMessageDate, currentMessageDate)) {
                const formattedDate = prevMessageDate.toLocaleString('ko-KR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const dateLabel = $('<div>').addClass('date-label').text(formattedDate);
                messageContainer.prepend(dateLabel);
            }
        }
    
        // 이전 메시지의 날짜를 갱신
        prevMessageDate = currentMessageDate;

        const date = new Date(message.created_at);
        const messageBox = createMessageBox(message, sender, messageLine);
        const dateBox = createAndAppendDateBox(date);
            
        messageLine.append(messageBox, dateBox);
        messageContainer.prepend(messageLine); // 상단에 추가
    });

    if (previousMessages.length > 0) {
        const lastMessageTime = previousMessages[previousMessages.length - 1].created_at;
        cursor = lastMessageTime; // 다음 요청을 위해 cursor 업데이트

        $('.chat').scrollTop(0);
    }

    if (previousMessages.length < perPage) {
        $('#loadPreviousMessages').hide();
        socket.emit('loadOldestMessage', { roomID: roomID });
    }
});

// 메시지 송신
formChat.addEventListener('submit', function() {
    let text = $('#input-text');

    if (text.val() == '') {
        return;
    } else {
        // 클라이언트에서 메시지 전송 신호를 서버로 발송
        const messageData = {
            message: text.val(),
            roomID: roomID,
            sender: sender,
            receiver: receiver
        };

        socket.emit('SEND', messageData);

        let messageLine = $('<div class="message-line">');
        let messageBox = $('<div class="sent-text-message">');

        const dateBox = createAndAppendDateBox(new Date());

        messageBox.append(text.val());
        messageBox.css('display', 'inline-block');
        messageLine.css('text-align', 'right');

        socket.emit('loadNewestMessage', { roomID: roomID });

        messageLine.append(messageBox, dateBox);

        $('#message').append(messageLine);
        text.val('');
        $('.chat').animate({ scrollTop: $('.chat')[0].scrollHeight }, 'slow');
    }
});

// 메시지 수신
socket.on('RECEIVE', function(message) {
    let messageLine = $('<div class="message-line">');
    let messageBox = $('<div class="received-text-message">');

    let receivedRoom = roomID;
    let receivedMessage = message;

    const dateBox = createAndAppendDateBox(new Date());

    if (receivedRoom === roomID) {
        messageBox.append(receivedMessage);
        messageBox.css('display', 'inline-block');

        socket.emit('loadNewestMessage', { roomID: roomID });

        messageLine.append(messageBox, dateBox);
        $('#message').append(messageLine);

        $('.chat').animate({ scrollTop: $('.chat')[0].scrollHeight }, 'slow');
    }
});

// 이미지 송신
document.getElementById('input-image').addEventListener('change', function() {
    const images = document.getElementById('input-image').files;
    uploadImages(images);
});

// 룸 접속 버튼 클릭 시
function joinRoom(roomID) {
    // 클라이언트에서 방 접속 신호를 서버로 발송
    socket.emit('joinRoom', roomID);
}

// 접속한 룸이 바뀌었을 때
socket.on('roomChanged', (joinedRoom) => {
    roomID = joinedRoom;
});