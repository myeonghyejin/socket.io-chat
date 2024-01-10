let formChat = document.getElementById('form-chat');

let sender;
let receiver;
let roomID;

let cursor = null;
let perPage = 30; // 페이지당 보여줄 메시지 수

let drawnDates = new Set(); // 이전에 그려진 날짜를 저장하는 변수

let socket = io();
socket.on('news', function (data) {
    console.log(data);
    socket.emit('my other event', {
        my: 'data'
    });
});

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


// 라벨을 그리는 함수
function drawDateLabel(date) {
    const messageContainer = $('#message');
    const dateLabel = $('<div>').addClass('date').text(date.toLocaleDateString('ko-KR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    messageContainer.prepend(dateLabel); // 날짜 라벨을 화면에 추가
}

// 채팅방 입장 시 이전 대화 내역 출력
socket.on('GET', (messages) => {
    const messageContainer = $('#message');

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
            let messageBox;

            const date = new Date(message.created_at);
            const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()); // 시간 정보 제외한 날짜 정보만 가지도록 설정

            // 이전 메시지와 현재 메시지의 날짜가 다를 경우에만 날짜 라벨 추가
            if (!prevMessageDate || prevMessageDate.getTime() !== messageDate.getTime()) {
                const formattedDate = messageDate.toLocaleString('ko-KR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const dateLabel = $('<div>').addClass('date').text(formattedDate);
                messageContainer.append(dateLabel); // 날짜 라벨 삽입
                prevMessageDate = messageDate;
            }

            const options = { weekday: 'short', hour: '2-digit', minute: '2-digit' };
            const formattedDateTime = date.toLocaleString('ko-KR', options);

            let dateBox;

            if (message.type === 'text') {
                messageBox = $('<div>').addClass('received-text-message').text(message.message);
                dateBox = $('<div>').addClass('dateBox').text(formattedDateTime);

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
                dateBox = $('<div>').addClass('dateBox').text(formattedDateTime);

                if (message.sender === sender) {
                    messageBox.removeClass('received-image-message').addClass('sent-image-message');
                    messageBox.css('display', 'inline-block');
                    messageLine.css('text-align', 'right');
                } else {
                    messageBox.css('display', 'inline-block');
                }

            }
                
            messageLine.append(messageBox, dateBox);
            messageContainer.append(messageLine);

            // 모든 메시지를 처리한 후에 스크롤을 맨 아래로 이동
            if (index === messages.length - 1) {
                const systemMessage = $('<div>').addClass('system').text('대화가 시작되었습니다.');
                messageContainer.append(systemMessage);
            }
        });
        console.log("messages", messages);
    } else {
        // 대화 내역이 없는 경우
        const systemMessage = $('<div>').addClass('system').text('대화가 시작되었습니다.');
        messageContainer.append(systemMessage);
    }

    // 초기 메시지 중 가장 오래된 메시지의 날짜 데이터 추출
    oldestMessageTime = messages[messages.length - perPage].created_at;

    $('.chat').scrollTop($('.chat')[0].scrollHeight);
});

socket.on('oldestMessage', (data) => {
    oldestMessageDate = new Date(data.oldestMessageDate);
    oldestMessageDate.setHours(0, 0, 0, 0); // 시간 정보를 0으로 설정하여 시간을 무시
    
    drawDateLabel(oldestMessageDate); // 라벨을 그리는 함수 호출
});

// '이전 대화 불러오기' 버튼 클릭
$('#loadPreviousMessages').click(() => {
    socket.emit('loadPreviousMessages', { roomID: roomID, cursor: cursor });
});

function compareDatesWithoutTime(dateA, dateB) {
    return dateA.getFullYear() === dateB.getFullYear() &&
           dateA.getMonth() === dateB.getMonth() &&
           dateA.getDate() === dateB.getDate();
}

socket.on('previousMessages', (previousMessages) => {
    const messageContainer = $('#message');

    // 불러온 메시지 중 가장 최신 메시지의 날짜 데이터 추출
    lastMessageTime = previousMessages[0].created_at;

    oldestMessageDate = new Date(oldestMessageTime);
    lastMessageDate = new Date(lastMessageTime);

    // 연도, 월, 일을 비교하여 같은지 확인
    const isSameDate = compareDatesWithoutTime(oldestMessageDate, lastMessageDate);

    if (isSameDate) {
        $('.date:first').remove();
    }

    let prevMessageDate = null; // 이전 메시지의 날짜를 저장하는 변수

    previousMessages.forEach((message, index) => {
        const messageLine = $('<div>').addClass('message-line');
        let messageBox;

        const currentMessageDate = new Date(message.created_at);
    
        if (prevMessageDate) {
            // 이전 메시지와 현재 메시지의 날짜를 비교할 수 있음
            if (!compareDatesWithoutTime(prevMessageDate, currentMessageDate)) {
                const formattedDate = prevMessageDate.toLocaleString('ko-KR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const dateLabel = $('<div>').addClass('date').text(formattedDate);
                messageContainer.prepend(dateLabel);
            }
        }
    
        // 이전 메시지의 날짜를 갱신
        prevMessageDate = currentMessageDate;

        const date = new Date(message.created_at);
        const options = { weekday: 'short', hour: '2-digit', minute: '2-digit' };
        const formattedDateTime = date.toLocaleString('ko-KR', options);

        let dateBox;

        if (message.type === 'text') {
            messageBox = $('<div>').addClass('received-text-message').text(message.message);
            dateBox = $('<div>').addClass('dateBox').text(formattedDateTime);

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
            dateBox = $('<div>').addClass('dateBox').text(formattedDateTime);

            if (message.sender === sender) {
                messageBox.removeClass('received-image-message').addClass('sent-image-message');
                messageBox.css('display', 'inline-block');
                messageLine.css('text-align', 'right');
            } else {
                messageBox.css('display', 'inline-block');
            }
        }
            
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


// 메시지 전송
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

        const now = new Date();
        const options = { weekday: 'short', hour: '2-digit', minute: '2-digit' };
        const formattedDateTime = now.toLocaleString('ko-KR', options);

        messageBox.append(text.val());
        messageBox.css('display', 'inline-block');
        messageLine.css('text-align', 'right');

        const dateBox = $('<div>').addClass('dateBox').text(formattedDateTime);

        messageLine.append(messageBox, dateBox);

        $('#message').append(messageLine);
        text.val('');
        $('.chat').animate({
            scrollTop: $('.chat')[0].scrollHeight
        }, 'slow');
    }
});

socket.on('RECEIVE', function(message) {
    let messageLine = $('<div class="message-line">');
    let messageBox = $('<div class="received-text-message">');

    let receivedRoom = roomID;
    let receivedMessage = message;

    if (receivedRoom === roomID) {
        messageBox.append(receivedMessage);
        messageBox.css('display', 'inline-block');

        messageLine.append(messageBox);
        $('#message').append(messageLine);

        $('.chat').animate({
            scrollTop: $('.chat')[0].scrollHeight
        }, 'slow');
    }
});

// 이미지 전송
document.getElementById('input-image').addEventListener('change', function() {
    const images = document.getElementById('input-image').files;
    uploadImages(images);
});

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
        }
    };

    xhr.send(formData);
}

function displayImages(imagePaths) {
    const messageContainer = $('#message');
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

        const now = new Date();
        const options = { weekday: 'short', hour: '2-digit', minute: '2-digit' };
        const formattedDateTime = now.toLocaleString('ko-KR', options);

        const messageBox = $('<div>').addClass('received-image-message').append(imgWrapper);
        messageBox.removeClass('received-image-message').addClass('sent-image-message');
        messageBox.css('display', 'inline-block');
        messageLine.css('text-align', 'right');
        const dateBox = $('<div>').addClass('dateBox').text(formattedDateTime);
        
        messageLine.append(messageBox, dateBox);
        messageContainer.append(messageLine);

        $('.chat').animate({
            scrollTop: $('.chat')[0].scrollHeight
        }, 'slow');
    });
}

// 룸 접속 버튼 클릭 시
function joinRoom(roomID) {
    // 클라이언트에서 방 접속 신호를 서버로 발송
    socket.emit('joinRoom', roomID);
}

// 접속한 룸이 바뀌었을 때
socket.on('roomChanged', (joinedRoom) => {
    roomID = joinedRoom;
});