import '../styles/chat.css';
import { useCallback, useMemo, useEffect, useState } from 'react';
import Chat from './Chat';
import Notice from './Notice';
import io from 'socket.io-client';

const socket = io.connect('http://localhost:8000', { autoConnect: false });

export default function ClientChatting() {
  const [msgInput, setMsgInput] = useState('');
  const [userIdInput, setUserIdInput] = useState('');
  const [userId, setUserId] = useState(null);
  const [chatList, setChatList] = useState([]);
  const [userList, setUserList] = useState({});
  const [frontList, setFrontList] = useState([]);
  const [backList, setBackList] = useState([]);
  const [fullList, setFullList] = useState([]);
  const [dmTo, setDmTo] = useState('all'); // DM 기능
  const [roomId, setRoomId] = useState('FRONTEND');

  const initSocketConnect = () => {
    console.log('connected', socket.connected);
    if (!socket.connected) socket.connect();
  };

  // mount 시점에
  useEffect(() => {
    // initSocketConnect();

    socket.on('error', (res) => {
      alert(res.msg);
    });

    // 유저 입장
    socket.on('entrySuccess', (res) => {
      setUserId(res.userId);
    });

    // 유저를 알려줌
    socket.on('userList', (res) => {
      setUserList(res);
    });

    socket.on('updateFrontList', (res) => {
      setFrontList(res);
    });

    socket.on('updateBackList', (res) => {
      setBackList(res);
    });

    socket.on('updateFullList', (res) => {
      setFullList(res);
    });
  }, []);

  // useMemo: 값을 메모라이징한다
  // 의존성 배열에 있는 값이 update될 때마다 연산을 실행한다
  const userListOptions = useMemo(() => {
    // jsx에서의 배열 문법
    // [<option></option>, <option></option>];
    const options = [];

    // for in : 뒤의 배열을 하나씩 탐색
    // for of : 뒤의 객체를 하나씩 탐색
    for (const key in userList) {
      // key: userList의 key값 (= socket.id값)
      // userList[key]: userList의 value값 (= 사용자가 입력한 id)
      if (userList[key] === userId) continue;

      options.push(
        <option key={key} value={key}>
          {userList[key]}
        </option>
      );
    }
    return options;
  }, [userList, frontList, backList]);

  const userListDivs = useMemo(() => {
    let chooseList;
    if (roomId === 'FRONTEND') chooseList = frontList;
    else if (roomId === 'BACKEND') chooseList = backList;
    else chooseList = fullList;

    const divs = [];
    for (const key in chooseList) {
      if (chooseList[key] === userId) continue;
      divs.push(
        <div key={key} onClick={() => userChat(chooseList, key)}>
          <hr />
          <p className="user">👤 {chooseList[key]}</p>
        </div>
      );
    }
    return divs;
  }, [userList, frontList, backList, fullList]);

  // useCallback: 함수를 메모라이징한다. 뒤에 있는 의존성 배열에 있는 값이 업데이트 될 때만 함수를 다시 선언한다. 그렇지 않은 경우, 기존에 있던 함수를 계속 사용한다
  const addChatList = useCallback(
    (res) => {
      // 서버에서 송신한 userId와 내 userId가 같다면 type의 값은 my, 다르면 other
      const type = res.userId === userId ? 'my' : 'other';

      // DM
      const content = `${res.dm ? '(속닥속닥) ' : ''} ${res.userId}: ${
        res.msg
      }`;
      const newChatList = [...chatList, { type: type, content: content }];
      setChatList(newChatList);
    },
    // userId와 chatList가 변경될 때마다 함수를 다시 선언
    [userId, chatList]
  );

  useEffect(() => {
    socket.on('chat', addChatList);
    return () => socket.off('chat', addChatList);
  }, [addChatList]);

  useEffect(() => {
    const notice = (res) => {
      const newChatList = [...chatList, { type: 'notice', content: res.msg }];
      setChatList(newChatList);
    };
    socket.on('notice', notice);
    return () => socket.off('notice', notice);
  }, [chatList]);

  const sendMsg = () => {
    // 메시지가 비어있지 않을 경우 송신
    if (msgInput !== '') {
      socket.emit('sendMsg', {
        userId: userId,
        msg: msgInput,
        dm: dmTo,
        roomId: roomId,
      });
      setMsgInput('');
    }
  };

  const handleEnter = (e) => {
    if (e.key === 'Enter') sendMsg();
  };

  const EntryhandleEnter = (e) => {
    if (e.key === 'Enter') entryChat();
  };

  const handleRefreshClick = () => {
    window.location.reload(true);
  };

  const entryChat = () => {
    initSocketConnect();
    socket.emit('entry', { userId: userIdInput, roomId: roomId });
    // 바로 userId에 값을 할당하지 않고
    // setUserId(userIdInput); // success
  };

  const userChat = (chooseList, key) => {
    // 단체 채팅방에서 유저 클릭시 1:1 채팅
    console.log(chooseList[key]);
  };

  return (
    <div className="chatting">
      <h2>SeSAC Chat</h2>
      {userId ? (
        <>
          <div className="main">
            <div className="chat-nav">
              <button onClick={handleRefreshClick}>✖️</button>
              <p>{roomId}</p>
            </div>
            <div className="main-container">
              <div className="chat-userlist">
                <p>대화 상대</p>
                <hr />
                <p className="user">👤 나</p>
                {userListDivs}
              </div>
              <div className="chat">
                <div className="chat-container">
                  {chatList.map((chat, i) => {
                    if (chat.type === 'notice')
                      return <Notice key={i} chat={chat} />;
                    else return <Chat key={i} chat={chat} />;
                  })}
                </div>
                <div className="input-container">
                  {/* DM 기능 구현 */}
                  <select
                    value={dmTo}
                    onChange={(e) => setDmTo(e.target.value)}
                  >
                    <option value="all">전체</option>
                    {userListOptions}
                  </select>
                  <input
                    type="text"
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    onKeyDown={handleEnter}
                  />
                  <button onClick={sendMsg}>전송</button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="entry-container ">
            <input
              type="text"
              placeholder="닉네임을 입력해주세요"
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
              onKeyDown={EntryhandleEnter}
            />
            <br />
            <div>채팅방 선택</div>
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="FRONTEND">FRONTEND</option>
              <option value="BACKEND">BACKEND</option>
              <option value="FULLSTACK">FULLSTACK</option>
            </select>
            <br />
            <button onClick={entryChat}>입장</button>
          </div>
        </>
      )}
    </div>
  );
}
