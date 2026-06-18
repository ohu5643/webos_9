export default class Explorer {

    constructor(fs, wm, auth) {

        this.fs = fs;
        this.wm = wm;
        this.auth = auth;

        this.currentFolderStack = [null];
        this.currentFolderNames = ["root"];

    }

    getCurrentFolder() {
        return this.currentFolderStack[
            this.currentFolderStack.length - 1
        ];
    }


    async open() {

        const user =
            this.auth.currentUser;

        if (!user) return;


        let nodes = [];

        try {

            nodes =
                await this.fs.getNodes(
                    user.uid,
                    this.getCurrentFolder()
                );

            console.log(
                "CURRENT FOLDER",
                this.getCurrentFolder()
            );

            console.log(
                "NODES",
                nodes
            );

        } catch (err) {

            console.error(err);
            alert("폴더 불러오기 실패");
            return;
        }


        const html =

            nodes.length === 0

            ?

            `<div>폴더가 비어있습니다.</div>`

            :

            nodes.map(node => {

                const safeName =
                    node.name
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#39;");

                return `

<div
    class="file-item"
    data-id="${node.id}"
    data-type="${node.type}"

    draggable="true"

    style="
        padding:8px;
        cursor:pointer;
        border-radius:6px;
        transition:.2s;
    "
>

    ${
        node.type === "folder"
        ? "📁"
        : "📄"
    }

    ${safeName}

</div>

`;

            }).join("");

        const win =
            this.wm.createWindow(

                "Explorer",

                `

        <div>

            현재 위치 :
${this.currentFolderNames.join("/")}
        </div>

        <button id="back-folder">
            ← 뒤로
        </button>

        <br><br>

        <button id="new-folder">
            새 폴더
        </button>

        <button id="new-file">
            새 파일
        </button>

        <hr>

        <div id="folder-list">

            ${html}

        </div>

        `
            );

        console.log(
            win.querySelectorAll(".file-item")
        );


        // =====================
        // 새 폴더
        // =====================

        win
            .querySelector(
                "#new-folder"
            )
            .addEventListener(

                "click",

                async () => {

                    const folderName =
                        prompt(
                            "폴더 이름"
                        );

                    if (!folderName || !folderName.trim()) {
                        alert("이름을 입력하세요");
                        return;
                    }


                    try {

                        await this.fs.createFolder(

                            user.uid,

                            folderName.trim(),

                            this.getCurrentFolder()

                        );

                    } catch (err) {

                        console.error(err);

                        alert(err.message);

                        return;
                    }

                    win.remove();

                    this.open();

                }
            );


        // =====================
        // 새 파일
        // =====================

        win
            .querySelector(
                "#new-file"
            )
            .addEventListener(

                "click",

                async () => {

                    const fileName =
                        prompt(
                            "파일 이름"
                        );

                    if (!fileName || !fileName.trim()) {
                        alert("이름을 입력하세요");
                        return;
                    }


                    try {

                        await this.fs.createFile(

                            user.uid,

                            fileName.trim(),

                            this.getCurrentFolder()

                        );

                    } catch (err) {

                        console.error(err);

                        alert(err.message);

                        return;
                    }

                    win.remove();

                    this.open();

                }
            );


        // =====================
        // 뒤로가기
        // =====================

        win
            .querySelector(
                "#back-folder"
            )
            .addEventListener(

                "click",

                () => {

                    if (
                        this.currentFolderStack.length <= 1
                    ) {

                        alert("최상위 폴더입니다.");
                        return;
                    }

                    this.currentFolderStack.pop();
                    this.currentFolderNames.pop();

                    win.remove();
                    this.open();

                }
            );

        // =====================
        // 파일/폴더 이벤트
        // =====================

        let draggedId = null;

        win
            .querySelectorAll(
                ".file-item"
            )
            .forEach(

                item => {

                    item.addEventListener(

                        "dragstart",

                        e => {

                            draggedId =
                                item.dataset.id;

                            console.log(
                                "drag start",
                                draggedId
                            );
                            e.dataTransfer.setData(
                                "text/plain",
                                draggedId
                            );

                            item.style.opacity =
                                "0.5";

                        }

                    );

                    item.addEventListener(

                        "dragend",

                        () => {

                            item.style.opacity =
                                "1";

                        }

                    );

                    if (
                        item.dataset.type ===
                        "folder"
                    ) {

                        item.addEventListener(

                            "dragover",

                            e => {

                                console.log(
                                    "dragover",
                                    item.dataset.id
                                );

                                e.preventDefault();

                                item.style.background =
                                    "#4a90ff";

                                item.style.color =
                                    "white";

                            }

                        );

                        item.addEventListener(

                            "dragleave",

                            () => {

                                item.style.background =
                                    "";

                                item.style.color =
                                    "";

                            }

                        );

                        item.addEventListener(

                            "drop",

                            async e => {

                                console.log(
                                    "DROP EVENT"
                                );

                                e.preventDefault();
                                e.stopPropagation();

                                item.style.background =
                                    "";

                                item.style.color =
                                    "";

                                if (
                                    draggedId ===
                                    item.dataset.id
                                ) return;

                                try {

                                    console.log(
                                        "drop",
                                        draggedId,
                                        item.dataset.id
                                    );

                                    await this.fs.moveNode(

                                        user.uid,

                                        draggedId,

                                        item.dataset.id

                                    );

                                    win.remove();

                                    this.open();

                                } catch (err) {

                                    console.error(err);

                                    alert(
                                        "이동 실패"
                                    );

                                }

                            }

                        );

                    }

                    // -----------------
                    // 더블클릭
                    // -----------------

                    item.addEventListener(

                        "dblclick",

                        async () => {

                            const id =
                                item.dataset.id;

                            const type =
                                item.dataset.type;

                            const name =
                                item.textContent
                                .replace("📁", "")
                                .replace("📄", "")
                                .trim();


                            // 폴더 열기

                            if (type === "folder") {

                                this.currentFolderStack.push(id);

                                this.currentFolderNames.push(name);

                                win.remove();

                                this.open();

                                return;
                            }

                            // 파일 열기

                            if (
                                type === "file"
                            ) {

                                let file;

                                try {

                                    file =
                                        await this.fs.getFile(
                                            user.uid,
                                            id
                                        );

                                } catch (err) {

                                    console.error(err);

                                    alert("파일 열기 실패");

                                    return;
                                }


                                const content =
                                    (file.content || "")
                                    .replace(/&/g, "&amp;")
                                    .replace(/</g, "&lt;")
                                    .replace(/>/g, "&gt;")
                                    .replace(/"/g, "&quot;")
                                    .replace(/'/g, "&#39;")
                                    .replace(/<\/textarea>/gi, "&lt;/textarea&gt;");

                                const noteWin =
                                    this.wm.createWindow(

                                        name,

                                        `

<textarea
id="editor"
style="
width:100%;
height:300px;
"
>${content}</textarea>

<br><br>

<button id="save-file">
저장
</button>

`

                                    );


                                noteWin
                                    .querySelector(
                                        "#save-file"
                                    )
                                    .addEventListener(

                                        "click",

                                        async () => {

                                            const content =
                                                noteWin
                                                .querySelector(
                                                    "#editor"
                                                )
                                                .value;


                                            try {

                                                await this.fs.saveFile(
                                                    user.uid,
                                                    id,
                                                    content
                                                );

                                                alert("저장 완료");




                                            } catch (err) {

                                                console.error(err);

                                                alert(
                                                    "저장 실패"
                                                );

                                            }

                                        }
                                    );

                            }

                        });


                    const openContextMenu = (
                        x,
                        y
                    ) => {

                        document
                            .querySelectorAll(
                                ".context-menu"
                            )
                            .forEach(
                                menu => menu.remove()
                            );

                        const menu =
                            document.createElement(
                                "div"
                            );

                        menu.className =
                            "context-menu";

                        menu.style.left =
                            `${x}px`;

                        menu.style.top =
                            `${y}px`;

                        menu.innerHTML = `

<div
class="context-menu-item"
data-action="rename"
>
이름 변경
</div>

<div
class="context-menu-item"
data-action="move"
>
이동
</div>

<div
class="context-menu-item"
data-action="delete"
>
삭제
</div>

`;

                        document.body.appendChild(
                            menu
                        );

                        const id =
                            item.dataset.id;

                        const name =
                            item.textContent
                            .replace("📁", "")
                            .replace("📄", "")
                            .trim();

                        menu
                            .querySelectorAll(
                                ".context-menu-item"
                            )
                            .forEach(

                                button => {

                                    button.addEventListener(

                                        "click",

                                        async () => {

                                            try {

                                                const action =
                                                    button.dataset.action;

                                                if (
                                                    action ===
                                                    "rename"
                                                ) {

                                                    const newName =
                                                        prompt(
                                                            "새 이름"
                                                        );

                                                    if (
                                                        !newName ||
                                                        !newName.trim()
                                                    ) return;

                                                    await this.fs.renameNode(

                                                        user.uid,

                                                        id,

                                                        newName.trim()

                                                    );

                                                } else if (
                                                    action ===
                                                    "move"
                                                ) {

                                                    console.log(
                                                        "MOVE CLICKED"
                                                    );

                                                    const allNodes =
                                                        await this.fs.getAllNodes(
                                                            user.uid
                                                        );

                                                    const isDescendant = (
                                                        targetId,
                                                        parentId
                                                    ) => {

                                                        const children =
                                                            allNodes.filter(
                                                                node =>
                                                                node.parentId ===
                                                                parentId
                                                            );

                                                        for (
                                                            const child of children
                                                        ) {

                                                            if (
                                                                child.id === targetId
                                                            ) {

                                                                return true;

                                                            }

                                                            if (
                                                                isDescendant(
                                                                    targetId,
                                                                    child.id
                                                                )
                                                            ) {

                                                                return true;

                                                            }

                                                        }

                                                        return false;

                                                    };

                                                    const folders =
                                                        allNodes.filter(

                                                            node =>

                                                            node.type ===
                                                            "folder"

                                                            &&

                                                            node.id !== id

                                                            &&

                                                            !isDescendant(
                                                                node.id,
                                                                id
                                                            )

                                                        );

                                                    console.log(
                                                        "MOVE TARGETS",
                                                        folders
                                                    );

                                                    console.log(
                                                        "MOVE WINDOW HTML",
                                                        folders.map(
                                                            folder =>
                                                    `
                                                    <div
                                                    class="move-folder"
                                                    data-id="${folder.id}"
                                                    >
                                                    📁 ${folder.name}
                                                    </div>
                                                    `
                                                        ).join("")
                                                    );
                                                    let moveWindow;

try {

    moveWindow =
        this.wm.createWindow(

            "이동",

            folders.map(
                folder =>
`
<div
class="move-folder"
data-id="${folder.id}"
>
📁 ${folder.name}
</div>
`
            ).join("")
        );

    console.log(
        "MOVE WINDOW CREATED",
        moveWindow
    );

} catch (err) {

    console.error(
        "CREATE WINDOW ERROR",
        err
    );

}

console.log(
    "MOVE WINDOW CREATED",
    moveWindow
);
                                                        

                                                    moveWindow
                                                        .querySelectorAll(
                                                            ".move-folder"
                                                        )
                                                        .forEach(

                                                            folderItem => {

                                                                folderItem
                                                                    .addEventListener(

                                                                        "click",

                                                                        async () => {

                                                                            try {

                                                                                await this.fs.moveNode(

                                                                                    user.uid,

                                                                                    id,

                                                                                    folderItem.dataset.id

                                                                                );

                                                                                moveWindow.remove();

                                                                                win.remove();

                                                                                this.open();

                                                                            } catch (err) {

                                                                                alert(
                                                                                    err.message
                                                                                );

                                                                            }

                                                                        }

                                                                    );

                                                            }

                                                        );

                                                } else if (
                                                    action ===
                                                    "delete"
                                                ) {

                                                    if (
                                                        !confirm(
                                                            `${name} 삭제할까?`
                                                        )
                                                    ) return;

                                                    await this.fs.deleteNode(

                                                        user.uid,

                                                        id

                                                    );

                                                }

                                                menu.remove();

                                                win.remove();

                                                this.open();

                                            } catch (err) {

                                                console.error(
                                                    err
                                                );

                                                alert(
                                                    err.message
                                                );

                                            }

                                        }

                                    );

                                }

                            );

                        setTimeout(() => {

                            document.addEventListener(

                                "click",

                                () => {

                                    menu.remove();

                                },

                                {
                                    once: true
                                }

                            );

                        }, 100);
                    };

                    item.addEventListener(

                        "contextmenu",

                        e => {

                            e.preventDefault();

                            openContextMenu(

                                e.clientX,

                                e.clientY

                            );

                        }

                    );

                    let pressTimer;

                    item.addEventListener(

                        "touchstart",

                        e => {

                            const touch =
                                e.touches[0];

                            pressTimer =
                                setTimeout(

                                    () => {

                                        openContextMenu(

                                            touch.clientX,

                                            touch.clientY

                                        );

                                    },

                                    700

                                );

                        }

                    );

                    item.addEventListener(

                        "touchend",

                        () => {

                            clearTimeout(
                                pressTimer
                            );

                        }

                    );

                    item.addEventListener(

                        "touchmove",

                        () => {

                            clearTimeout(
                                pressTimer
                            );

                        }

                    );

                }

            );

    }

}
