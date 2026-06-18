import './style.css';

import WindowManager from './kernel/WindowManager.js';
import FileSystem from './kernel/FileSystem.js';

import { auth } from './firebase/firebase.js';

import Explorer from "./apps/Explorer.js";
import Notepad from "./apps/Notepad.js";
import AIAssistant from "./apps/AIAssistant.js";
import Terminal from "./apps/Terminal.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "firebase/auth";


// =========================
// LOGIN
// =========================
function renderLogin() {

    document.querySelector('#app').innerHTML = `

    <div id="login-screen">

        <h2>WebOS Login</h2>

        <input id="email" placeholder="Email">

        <br><br>

        <input
            id="password"
            type="password"
            placeholder="Password"
        >

        <br><br>

        <button id="register">
            회원가입
        </button>

        <button id="login">
            로그인
        </button>

    </div>
    `;


    // 회원가입
    document
        .getElementById("register")
        .addEventListener(
            "click",
            async () => {

                const email =
                    document.getElementById("email").value;

                const password =
                    document.getElementById("password").value;

                try {

                    await createUserWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );

                    alert("회원가입 성공");

                } catch (error) {

                    alert(error.message);

                }

            }
        );


    // 로그인
    document
        .getElementById("login")
        .addEventListener(
            "click",
            async () => {

                const email =
                    document.getElementById("email").value;

                const password =
                    document.getElementById("password").value;

                try {

                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );

                } catch (error) {

                    alert(error.message);

                }

            }
        );

}


// =========================
// DESKTOP
// =========================
async function renderDesktop() {

    document.querySelector('#app').innerHTML = `

    <div id="desktop">

        <div id="taskbar">
            <div id="start-button">
                WebOS
            </div>
        </div>

        <div id="desktop-icons">

            <div class="icon" id="explorer-icon">
                📁
                <span>Explorer</span>
            </div>

            <div class="icon" id="ai-icon">
                🤖
                <span>AI</span>
            </div>

            <div class="icon" id="notepad-icon">
                📝
                <span>Notepad</span>
            </div>

            <div class="icon" id="terminal-icon">
                💻
                <span>Terminal</span>
            </div>

        </div>

    </div>
    `;


    const wm = new WindowManager();
    const fs = new FileSystem();

    const explorer =
        new Explorer(
            fs,
            wm,
            auth
        );

    const notepad =
        new Notepad(
            wm
        );

    const terminal =
        new Terminal(
            fs,
            wm,
            auth
        );

    const ai =
        new AIAssistant(
            wm,
            explorer,
            notepad,
            terminal,
            fs,
            auth
        );


    // 아이콘 실행
    document
        .getElementById("explorer-icon")
        .addEventListener(
            "dblclick",
            () => explorer.open()
        );

    document
        .getElementById("notepad-icon")
        .addEventListener(
            "dblclick",
            () => notepad.open()
        );

    document
        .getElementById("ai-icon")
        .addEventListener(
            "dblclick",
            () => ai.open()
        );

    document
        .getElementById("terminal-icon")
        .addEventListener(
            "dblclick",
            () => terminal.open()
        );


    // 파일 시스템 초기화
    await fs.initialize(
        auth.currentUser.uid
    );


    // =========================
    // 우클릭 메뉴
    // =========================
    const desktop =
        document.getElementById(
            "desktop"
        );

    desktop.addEventListener(

        "contextmenu",

        (e) => {

            e.preventDefault();

            const oldMenu =
                document.getElementById(
                    "context-menu"
                );

            if (oldMenu)
                oldMenu.remove();


            const menu =
                document.createElement(
                    "div"
                );

            menu.id = "context-menu";

            menu.innerHTML = `

                <div id="desktop-new-folder">
                    📁 새 폴더
                </div>

                <div id="desktop-new-file">
                    📄 새 파일
                </div>

                <div id="desktop-terminal">
                    💻 터미널
                </div>

                <div id="desktop-refresh">
                    🔄 새로고침
                </div>

            `;

            menu.style.position = "absolute";
            menu.style.left = e.pageX + "px";
            menu.style.top = e.pageY + "px";
            menu.style.background = "#222";
            menu.style.color = "white";
            menu.style.padding = "10px";
            menu.style.border = "1px solid gray";
            menu.style.zIndex = "9999";

            document.body.appendChild(
                menu
            );


            // 새 폴더
            document
                .getElementById(
                    "desktop-new-folder"
                )
                .onclick =
                async () => {

                    const name =
                        prompt(
                            "폴더 이름"
                        );

                    if (!name) return;

                    await fs.createFolder(
                        auth.currentUser.uid,
                        name
                    );

                    menu.remove();

                };


            // 새 파일
            document
                .getElementById(
                    "desktop-new-file"
                )
                .onclick =
                async () => {

                    const name =
                        prompt(
                            "파일 이름"
                        );

                    if (!name) return;

                    await fs.createFile(
                        auth.currentUser.uid,
                        name
                    );

                    menu.remove();

                };


            // 터미널
            document
                .getElementById(
                    "desktop-terminal"
                )
                .onclick =
                () => {

                    terminal.open();

                    menu.remove();

                };


            // 새로고침
            document
                .getElementById(
                    "desktop-refresh"
                )
                .onclick =
                () => {

                    menu.remove();

                    renderDesktop();

                };

        }
    );


    // 메뉴 닫기
    document.addEventListener(

        "click",

        () => {

            const menu =
                document.getElementById(
                    "context-menu"
                );

            if (menu)
                menu.remove();

        }

    );

}


// =========================
// APP START
// =========================
onAuthStateChanged(

    auth,

    (user) => {

        if (user) {

            console.log(
                "Logged In:",
                user.uid
            );

            renderDesktop();

        }

        else {

            renderLogin();

        }

    }

);
