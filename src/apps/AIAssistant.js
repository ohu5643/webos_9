import { speak } from "../services/TTSService.js";
import { parseCommand } from "../services/CommandParser.js";
import { getRuntimeContext } from "../services/RuntimeContext.js";
import ChatHistoryService from "../services/ChatHistoryService.js";

export default class AIAssistant {
    constructor(
        wm,
        explorer,
        notepad,
        terminal,
        fs,
        auth
    ) {
        this.wm = wm;
        this.explorer = explorer;
        this.notepad = notepad;
        this.terminal = terminal;
        this.fs = fs;
        this.auth = auth;
        this.chatHistoryService = new ChatHistoryService();
        this.messages = [];
        this.pendingCommand = null;
    }

    escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    getRole(sender) {
        return sender === "나" ? "user" : "assistant";
    }

    renderMessage(chat, sender, content, usePre = false) {
        const body = usePre
            ? `<pre>${this.escapeHtml(content)}</pre>`
            : this.escapeHtml(content);

        chat.innerHTML += `
            <div>
                <b>${this.escapeHtml(sender)}:</b>
                ${body}
            </div>
        `;

        chat.scrollTop = chat.scrollHeight;
    }

    async addMessage(chat, sender, content, usePre = false, shouldSave = true) {
        this.renderMessage(
            chat,
            sender,
            content,
            usePre
        );

        const role = this.getRole(sender);

        this.messages.push({
            role,
            content
        });

        this.messages = this.messages.slice(-20);

        if (!shouldSave) return;

        const user = this.auth.currentUser;

        if (!user) return;

        try {
            await this.chatHistoryService.saveMessage(
                user.uid,
                role,
                content
            );
        } catch (err) {
            console.error("Chat history save failed", err);
        }
    }

    getUser() {
        const user = this.auth.currentUser;

        if (!user) {
            throw new Error("로그인이 필요합니다.");
        }

        return user;
    }

    normalizePath(path) {
        return String(path || "")
            .trim()
            .replace(/^["'`]|["'`]$/g, "")
            .replace(/^(root|루트)\s*\/?/i, "")
            .replace(/\\/g, "/")
            .replace(/^\/+|\/+$/g, "");
    }

    buildPath(node, nodes) {
        const names = [];
        let current = node;

        while (current) {
            names.unshift(current.name);
            current = nodes.find(item => item.id === current.parentId);
        }

        return `root/${names.join("/")}`;
    }

    async resolveNode(uid, path, expectedType = null) {
        const normalized = this.normalizePath(path);

        if (!normalized) {
            throw new Error("대상 이름이나 경로를 알려주세요.");
        }

        const nodes = await this.fs.getAllNodes(uid);
        const parts = normalized.split("/").filter(Boolean);

        if (parts.length > 1) {
            let parentId = null;
            let current = null;

            for (const part of parts) {
                current = nodes.find(
                    node =>
                        node.parentId === parentId &&
                        node.name.toLowerCase() === part.toLowerCase()
                );

                if (!current) {
                    throw new Error(`${normalized} 경로를 찾지 못했어요.`);
                }

                parentId = current.id;
            }

            if (expectedType && current.type !== expectedType) {
                throw new Error(`${normalized}은 ${expectedType} 타입이 아닙니다.`);
            }

            return {
                node: current,
                nodes
            };
        }

        const matches = nodes.filter(
            node =>
                node.name.toLowerCase() === normalized.toLowerCase() &&
                (!expectedType || node.type === expectedType)
        );

        if (matches.length === 0) {
            throw new Error(`${normalized}을 찾지 못했어요.`);
        }

        if (matches.length > 1) {
            const paths = matches
                .map(node => this.buildPath(node, nodes))
                .join("\n");

            throw new Error(`같은 이름이 여러 개 있어요. 정확한 경로로 말해주세요.\n${paths}`);
        }

        return {
            node: matches[0],
            nodes
        };
    }

    async resolveFolderId(uid, path) {
        const normalized = this.normalizePath(path);

        if (!normalized) return null;

        const { node } = await this.resolveNode(
            uid,
            normalized,
            "folder"
        );

        return node.id;
    }

    createFileEditor(uid, fileId, title, content = "") {
        const editorWin =
            this.wm.createWindow(
                title,
                `
                    <textarea
                        id="ai-file-editor"
                        style="
                            width:100%;
                            height:300px;
                        "
                    >${this.escapeHtml(content).replace(/<\/textarea>/gi, "&lt;/textarea&gt;")}</textarea>

                    <br><br>

                    <button id="ai-save-file">
                        저장
                    </button>
                `
            );

        editorWin
            .querySelector("#ai-save-file")
            .addEventListener(
                "click",
                async () => {
                    const newContent =
                        editorWin.querySelector("#ai-file-editor").value;

                    await this.fs.saveFile(
                        uid,
                        fileId,
                        newContent
                    );

                    alert("저장 완료");
                }
            );
    }

    formatNodes(nodes) {
        if (nodes.length === 0) {
            return "파일이나 폴더가 없습니다.";
        }

        return nodes
            .map(node => {
                const icon = node.type === "folder" ? "📁" : "📄";
                return `${icon} ${this.buildPath(node, nodes)}`;
            })
            .join("\n");
    }

    formatTree(nodes, parentId = null, prefix = "root") {
        const children = nodes.filter(node => node.parentId === parentId);

        if (children.length === 0) {
            return prefix;
        }

        return [
            prefix,
            ...children.map(node => {
                const icon = node.type === "folder" ? "📁" : "📄";
                const childPath = `${prefix}/${icon} ${node.name}`;

                if (node.type !== "folder") {
                    return childPath;
                }

                return this.formatTree(nodes, node.id, childPath);
            })
        ].join("\n");
    }

    getLastAssistantMessage() {
        return [...this.messages]
            .reverse()
            .find(message => message.role === "assistant");
    }

    getTerminalCommandDescriptions() {
        return [
            "터미널 명령어 설명",
            "",
            "help: 사용 가능한 명령어 목록을 보여줍니다.",
            "ls: 현재 폴더의 파일과 폴더를 보여줍니다.",
            "pwd: 현재 위치 경로를 보여줍니다.",
            "cd [folder]: 지정한 폴더로 이동합니다.",
            "cd ..: 상위 폴더로 이동합니다.",
            "mkdir [name]: 새 폴더를 만듭니다.",
            "touch [name]: 새 파일을 만듭니다.",
            "rm [name]: 파일이나 폴더를 삭제합니다.",
            "cat [filename]: 파일 내용을 출력합니다.",
            "tree: 전체 파일 트리를 보여줍니다.",
            "whoami: 현재 로그인 사용자 정보를 보여줍니다.",
            "date: 현재 날짜와 시간을 보여줍니다.",
            "echo [text]: 입력한 텍스트를 그대로 출력합니다.",
            "clear: 터미널 화면을 지웁니다."
        ].join("\n");
    }

    async runBatch(commands) {
        const results = [];

        for (const item of commands) {
            results.push(
                await this.runCommand(item)
            );
        }

        return results.join("\n");
    }

    async runCommand(command) {
        const user = this.getUser();

        switch (command.action) {
            case "batch":
                return await this.runBatch(
                    command.commands
                );

            case "confirm_pending": {
                if (!this.pendingCommand) {
                    return "이어 실행할 작업이 없어요. 어떤 작업을 할지 다시 말해주세요.";
                }

                const pending =
                    this.pendingCommand;

                this.pendingCommand = null;

                return await this.runCommand(pending);
            }

            case "explain_previous": {
                const lastAssistant =
                    this.getLastAssistantMessage();

                if (
                    lastAssistant &&
                    lastAssistant.content.includes("사용 가능한 터미널 명령어")
                ) {
                    return this.getTerminalCommandDescriptions();
                }

                return null;
            }

            case "open_notepad":
                this.notepad.open();
                return "메모장을 실행했어요.";

            case "open_explorer":
                this.explorer.open();
                return "파일 탐색기를 열었어요.";

            case "open_terminal":
                this.terminal.open();
                return "터미널을 열었어요.";

            case "create_folder": {
                if (!command.name) {
                    throw new Error("만들 폴더 이름을 알려주세요.");
                }

                const parentId =
                    await this.resolveFolderId(
                        user.uid,
                        command.parentPath
                    );

                await this.fs.createFolder(
                    user.uid,
                    command.name,
                    parentId
                );

                return `${command.name} 폴더를 만들었어요.`;
            }

            case "create_file": {
                if (!command.name) {
                    throw new Error("만들 파일 이름을 알려주세요.");
                }

                const parentId =
                    await this.resolveFolderId(
                        user.uid,
                        command.parentPath
                    );

                await this.fs.createFile(
                    user.uid,
                    command.name,
                    parentId
                );

                return `${command.name} 파일을 만들었어요.`;
            }

            case "list_files": {
                const nodes = await this.fs.getNodes(user.uid);
                return this.formatNodes(nodes);
            }

            case "show_file_tree": {
                const nodes = await this.fs.getAllNodes(user.uid);
                return this.formatTree(nodes);
            }

            case "read_file": {
                const { node } =
                    await this.resolveNode(
                        user.uid,
                        command.targetPath,
                        "file"
                    );

                const file =
                    await this.fs.getFile(
                        user.uid,
                        node.id
                    );

                return file.content || "(빈 파일입니다.)";
            }

            case "open_file": {
                const { node } =
                    await this.resolveNode(
                        user.uid,
                        command.targetPath,
                        "file"
                    );

                const file =
                    await this.fs.getFile(
                        user.uid,
                        node.id
                    );

                this.createFileEditor(
                    user.uid,
                    node.id,
                    node.name,
                    file.content
                );

                return `${node.name} 파일을 열었어요.`;
            }

            case "rename_node": {
                if (!command.newName) {
                    throw new Error("새 이름을 알려주세요.");
                }

                const { node } =
                    await this.resolveNode(
                        user.uid,
                        command.targetPath
                    );

                await this.fs.renameNode(
                    user.uid,
                    node.id,
                    command.newName
                );

                return `${node.name} 이름을 ${command.newName}(으)로 바꿨어요.`;
            }

            case "move_node": {
                const { node } =
                    await this.resolveNode(
                        user.uid,
                        command.targetPath
                    );

                const targetFolderId =
                    await this.resolveFolderId(
                        user.uid,
                        command.targetFolderPath
                    );

                await this.fs.moveNode(
                    user.uid,
                    node.id,
                    targetFolderId
                );

                return `${node.name}을 이동했어요.`;
            }

            case "delete_node": {
                const { node } =
                    await this.resolveNode(
                        user.uid,
                        command.targetPath
                    );

                await this.fs.deleteNode(
                    user.uid,
                    node.id
                );

                return `${node.name}을 삭제했어요.`;
            }

            case "show_os_features":
                return [
                    "WebOS 기능",
                    "",
                    "- 파일 탐색기 실행",
                    "- 메모장 실행",
                    "- 터미널 실행",
                    "- 파일/폴더 생성",
                    "- 파일 열기/읽기/저장",
                    "- 이름 변경",
                    "- 이동",
                    "- 삭제",
                    "- 파일 목록과 트리 확인",
                    "- TTS 음성 출력",
                    "- Firebase 파일 저장"
                ].join("\n");

            case "show_terminal_commands":
                return [
                    "사용 가능한 터미널 명령어",
                    "",
                    "help",
                    "ls",
                    "pwd",
                    "cd [folder]",
                    "mkdir [name]",
                    "touch [name]",
                    "rm [name]",
                    "cat [filename]",
                    "tree",
                    "whoami",
                    "date",
                    "echo [text]",
                    "clear"
                ].join("\n");

            default:
                return null;
        }
    }

    async askGemini(prompt) {
        const runtime =
            await getRuntimeContext(
                this.fs,
                this.auth
            );

        const recentConversation =
            this.messages
                .slice(-10)
                .map(message => {
                    const label =
                        message.role === "user"
                            ? "사용자"
                            : "AI";

                    return `${label}: ${message.content}`;
                })
                .join("\n");

        const response =
            await fetch(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AQ.Ab8RN6Jr7HjAULwv17EVTH2pFfzirEujX_l-8Yu6PRx-plbvYw",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    {
                                        text: `
                                            너는 WebOS 내부 AI 비서이다.

                                            현재 시스템 상태:
                                            ${JSON.stringify(runtime)}

                                            최근 대화:
                                            ${recentConversation}

                                            사용자의 질문:
                                            ${prompt}

                                            규칙:
                                            - WebOS 구조를 이해하고 답변해라.
                                            - 최근 대화를 참고해서 "그거", "각각", "어", "변경" 같은 후속 발화를 이해해라.
                                            - 가능한 명령은 앱 실행, 파일/폴더 생성, 파일 열기/읽기, 이름 변경, 이동, 삭제이다.
                                            - 실제 실행이 필요한 요청은 사용자가 다시 명확히 말하도록 안내해라.
                                            - FileSystem은 Firestore document id 기반임을 유지해야 한다.
                                        `
                                    }
                                ]
                            }
                        ]
                    })
                }
            );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const answer =
            data?.candidates?.[0]
                ?.content?.parts?.[0]
                ?.text;

        if (!answer) {
            throw new Error(JSON.stringify(data));
        }

        return answer;
    }

    async loadRecentMessages(chat) {
        const user = this.auth.currentUser;

        if (!user) return;

        try {
            const messages =
                await this.chatHistoryService.loadRecentMessages(
                    user.uid
                );

            this.messages = messages.slice(-20);

            for (const message of this.messages) {
                this.renderMessage(
                    chat,
                    message.role === "user" ? "나" : "AI",
                    message.content,
                    message.content.includes("\n")
                );
            }
        } catch (err) {
            console.error("Chat history load failed", err);
        }
    }

    open() {
        const aiWin =
            this.wm.createWindow(
                "AI Assistant",
                `
                    <div
                        id="chat"
                        style="
                            height:300px;
                            overflow:auto;
                            border:1px solid #555;
                            margin-bottom:10px;
                            padding:5px;
                        "
                    ></div>

                    <textarea
                        id="prompt"
                        style="
                            width:100%;
                            height:80px;
                        "
                    ></textarea>

                    <button id="send-ai">
                        전송
                    </button>
                `
            );

        const sendBtn =
            aiWin.querySelector("#send-ai");

        const promptInput =
            aiWin.querySelector("#prompt");

        const chat =
            aiWin.querySelector("#chat");

        this.loadRecentMessages(chat);

        const handleSend =
            async () => {
                const prompt =
                    promptInput.value.trim();

                if (!prompt) return;

                promptInput.value = "";

                await this.addMessage(
                    chat,
                    "나",
                    prompt
                );

                const command =
                    parseCommand(prompt);

                try {
                    const answer = command
                        ? await this.runCommand(command)
                        : await this.askGemini(prompt);

                    if (answer) {
                        await this.addMessage(
                            chat,
                            "AI",
                            answer,
                            answer.includes("\n")
                        );

                        speak(answer);
                    }
                } catch (err) {
                    console.error(err);

                    const message =
                        `실행 실패: ${err.message}`;

                    await this.addMessage(
                        chat,
                        "AI",
                        message,
                        message.includes("\n")
                    );

                    speak(message);
                }
            };

        sendBtn.addEventListener(
            "click",
            handleSend
        );

        promptInput.addEventListener(
            "keydown",
            event => {
                if (event.key !== "Enter" || event.shiftKey) return;

                event.preventDefault();
                handleSend();
            }
        );
    }
}
