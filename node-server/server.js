const http = require('http'); // 소켓은 http 파일을 열어야만 사용할 수 있다
const express = require('express');
const app = express();
const server = http.createServer(app); // 소켓은 http 모듈로 생성된 서버에서만 동작한다
const PORT = 8000;
const cors = require('cors'); // CORS issue
app.use(cors());

const io = require('socket.io')(server, {
  cors: {
    origin: 'http://localhost:3000',
  },
});

// 딕셔너리 타입
const userIdArr = {}; // 유저 ID
const userRoomIdArr = {}; // room

// 유저를 알려줌
const updateUserList = () => {
  io.emit('userList', userIdArr);
};

// room
const updateAllRoom = (roomId) => {
  // userRoomIdArr에서 roomId와 일치하는 socket.id 찾기
  const socketIdInRoom = Object.keys(userRoomIdArr).filter(
    (socketId) => userRoomIdArr[socketId] === roomId
  );

  // userIdArr에서 socketIdInRoom 배열과 일치하는 socket.id : userId 저장
  const usersInRoom = socketIdInRoom.reduce((acc, socketId) => {
    acc[socketId] = userIdArr[socketId];
    return acc;
  }, {});

  if (roomId === 'FRONTEND') io.emit('updateFrontList', usersInRoom);
  else if (roomId === 'BACKEND') io.emit('updateBackList', usersInRoom);
  else io.emit('updateFullList', usersInRoom);
};

// 공지사항
io.on('connection', (socket) => {
  console.log('socket id: ', socket.id);
  // socket id를 이용해 입장 공지
  // socket.id : Socket.io에서 사용되는 소켓의 고유 식별자. 각 클라이언트 소켓은 고유한 socket.id를 가지고 있으며, 이를 통해 서버와 클라이언트 간에 소켓을 식별한다. 문자열 형태
  // io.emit("notice", { msg: `${socket.id}님이 입장하셨습니다.` });

  // 입장 시 받은 user id로 입장 공지
  socket.on('entry', (res) => {
    // 닉네임 중복 방지
    // includes(): 문자열이나 배열에서 인자로 넘겨준 값이 존재하는지 안하는지 찾는 메서드
    // indexOf(): 배열에서 인자로 넘겨준 값의 인덱스를 추출하는 메서드. 없다면, -1을 반환
    if (Object.values(userIdArr).includes(res.userId)) {
      // 닉네임이 중복될 경우
      socket.emit('error', {
        msg: '중복된 아이디가 존재하여 입장이 불가합니다',
      });
    } else {
      // 닉네임이 중복되지 않을 경우에
      // 해당하는 단체방에 입장
      socket.join(res.roomId);
      userRoomIdArr[socket.id] = res.roomId;

      // 중복되지 않을 경우 정상적으로 notice (io객체: 모든 클라이언트에게 이벤트 발송)
      // io.to(room).emit() : 특정한 방(room)에 속한 모든 클라이언트에게 데이터 전송
      io.to(res.roomId).emit('notice', {
        msg: `${res.userId}님이 입장하셨습니다.`,
      });
      // 유저 입장
      socket.emit('entrySuccess', { userId: res.userId });
      userIdArr[socket.id] = res.userId;
    }
    // 중복 메시지를 보내주던지
    console.log('userIdArr: ', userIdArr);
    console.log('userRoomIdArr: ', userRoomIdArr);
    updateUserList();
    updateAllRoom(res.roomId);
  });

  // 퇴장시키기
  socket.on('disconnect', () => {
    let deleteAllRoom;
    if (userIdArr[socket.id]) {
      io.to(userRoomIdArr[socket.id]).emit('notice', {
        msg: `${userIdArr[socket.id]}님이 퇴장하셨습니다.`,
      });
      // socket.leave(room) : 클라이언트를 특정 방(room)에서 나가게 하는 메서드
      socket.leave(userRoomIdArr[socket.id]);
      deleteAllRoom = userRoomIdArr[socket.id];
      delete userRoomIdArr[socket.id]; // 삭제
      delete userIdArr[socket.id];
    }
    console.log('userIdArr: ', userIdArr);
    updateUserList();
    updateAllRoom(deleteAllRoom);
  });

  socket.on('sendMsg', (res) => {
    if (res.dm === 'all')
      // 유저의 id, 메시지를 전체에게 송신
      io.to(res.roomId).emit('chat', { userId: res.userId, msg: res.msg });
    else {
      // 원하는 사람에게만 메시지(socket)을 보낸다
      // io.to(socket.id).emit()
      io.to(res.dm).emit('chat', {
        userId: res.userId,
        msg: res.msg,
        dm: true,
      });
      // 나에게 보내는 메시지를 송신
      socket.emit('chat', { userId: res.userId, msg: res.msg, dm: true });
    }
  });
});

server.listen(PORT, function () {
  console.log(`Sever Open: ${PORT}`);
});
