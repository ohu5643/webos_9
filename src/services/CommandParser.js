function normalizeText(text) {
    return text.trim().replace(/\s+/g, " ");
}

function stripJosa(value) {
    return value.replace(/(을|를|이|가|은|는|로|으로|에|안에)$/g, "");
}

function cleanName(value = "") {
    let result =
        value
            .replace(/^(root|루트)\s*\/?/i, "")
            .replace(/^["'`]|["'`]$/g, "")
            .trim();

    const suffixes = [
        "만들어줘",
        "만들어",
        "생성해줘",
        "생성",
        "열어줘",
        "열어",
        "보여줘",
        "보여",
        "삭제해줘",
        "삭제",
        "지워줘",
        "지워",
        "이름 변경해줘",
        "이름 변경",
        "변경해줘",
        "변경",
        "바꿔줘",
        "바꿔",
        "이동해줘",
        "이동",
        "옮겨줘",
        "옮겨",
        "폴더",
        "파일",
        "문서",
        "내용"
    ];

    let changed = true;

    while (changed) {
        changed = false;

        for (const suffix of suffixes) {
            if (result.endsWith(suffix)) {
                result = result.slice(0, -suffix.length).trim();
                changed = true;
            }
        }

        const stripped = stripJosa(result).trim();

        if (stripped !== result) {
            result = stripped;
            changed = true;
        }
    }

    return result;
}

function getQuotedTexts(text) {
    return [...text.matchAll(/["'`](.+?)["'`]|“(.+?)”|‘(.+?)’/g)]
        .map(match => match[1] || match[2] || match[3])
        .filter(Boolean)
        .map(value => value.trim());
}

function getParentPath(text) {
    const match =
        text.match(/(.+?)\s*(?:에|안에)\s+.+?(?:폴더|파일|문서)/);

    return match ? cleanName(match[1]) : null;
}

function parseCreate(text, lower) {
    const commands = [];
    const quoted = getQuotedTexts(text);
    const nameText =
        text.replace(/^(.+?)\s*(?:에|안에)\s+/, "");

    if (
        lower.includes("폴더") &&
        (lower.includes("만들") || lower.includes("생성") || lower.startsWith("mkdir "))
    ) {
        const match =
            nameText.match(/(.+?)\s*폴더/);

        const name =
            lower.startsWith("mkdir ")
                ? cleanName(text.slice(6))
                : quoted[0] || cleanName(match?.[1]);

        if (name) {
            commands.push({
                action: "create_folder",
                name,
                parentPath: getParentPath(text)
            });
        }
    }

    if (
        (lower.includes("파일") || lower.includes("문서")) &&
        (lower.includes("만들") || lower.includes("생성") || lower.startsWith("touch "))
    ) {
        const match =
            nameText.match(/(?:와|과|그리고|,)\s*(.+?)\s*(?:파일|문서)/) ||
            nameText.match(/(.+?)\s*(?:파일|문서)/);

        const name =
            lower.startsWith("touch ")
                ? cleanName(text.slice(6))
                : quoted[1] || quoted[0] || cleanName(match?.[1]);

        if (name) {
            commands.push({
                action: "create_file",
                name,
                parentPath: getParentPath(text)
            });
        }
    }

    if (commands.length === 0) return null;

    return commands.length === 1
        ? commands[0]
        : {
            action: "batch",
            commands
        };
}

function parseRename(text, lower) {
    if (!(lower.includes("이름") || lower.includes("rename") || lower.includes("변경") || lower.includes("바꿔"))) {
        return null;
    }

    const quoted = getQuotedTexts(text);

    if (quoted.length >= 2) {
        return {
            action: "rename_node",
            targetPath: quoted[0],
            newName: quoted[1]
        };
    }

    const patterns = [
        /(.+?)\s*(?:폴더|파일|문서)?\s*이름(?:을|를)?\s*(.+?)(?:로|으로)\s*(?:변경|바꿔)/,
        /(.+?)\s*(?:폴더|파일|문서)?(?:을|를)\s*(.+?)(?:로|으로)\s*(?:변경|바꿔)/,
        /(.+?)\s+(.+?)(?:로|으로)\s*(?:변경|바꿔)/
    ];

    const short =
        patterns
            .map(pattern => text.match(pattern))
            .find(Boolean);

    if (!short) return null;

    return {
        action: "rename_node",
        targetPath: cleanName(short[1]),
        newName: cleanName(short[2])
    };
}

function parseMove(text, lower) {
    if (!(lower.includes("이동") || lower.includes("옮겨") || lower.startsWith("mv "))) return null;

    if (lower.startsWith("mv ")) {
        const parts = normalizeText(text).split(" ");

        return {
            action: "move_node",
            targetPath: parts[1],
            targetFolderPath: parts[2]
        };
    }

    const quoted = getQuotedTexts(text);

    if (quoted.length >= 2) {
        return {
            action: "move_node",
            targetPath: quoted[0],
            targetFolderPath: quoted[1]
        };
    }

    const match =
        text.match(/(.+?)\s*(?:을|를)?\s*(.+?)(?:에|안에|로|으로)\s*(?:이동|옮겨)/);

    if (!match) return null;

    return {
        action: "move_node",
        targetPath: cleanName(match[1]),
        targetFolderPath: cleanName(match[2])
    };
}

function parseDelete(text, lower) {
    if (!(lower.includes("삭제") || lower.includes("지워") || lower.startsWith("rm "))) return null;

    return {
        action: "delete_node",
        targetPath: lower.startsWith("rm ")
            ? cleanName(text.slice(3))
            : getQuotedTexts(text)[0] || cleanName(text)
    };
}

function parseOpenRead(text, lower) {
    if (lower.includes("터미널") || lower.includes("terminal")) {
        return {
            action: "open_terminal"
        };
    }

    if (lower.includes("메모장") || lower.includes("notepad")) {
        return {
            action: "open_notepad"
        };
    }

    if (lower.includes("파일 탐색기") || lower.includes("탐색기") || lower.includes("explorer")) {
        return {
            action: "open_explorer"
        };
    }

    if (
        (lower.includes("열어") || lower.includes("open ")) &&
        (lower.includes("파일") || lower.includes(".txt") || lower.startsWith("open "))
    ) {
        return {
            action: "open_file",
            targetPath: lower.startsWith("open ")
                ? cleanName(text.slice(5))
                : getQuotedTexts(text)[0] || cleanName(text)
        };
    }

    if (
        lower.startsWith("cat ") ||
        lower.includes("내용 보여") ||
        lower.includes("읽어")
    ) {
        return {
            action: "read_file",
            targetPath: lower.startsWith("cat ")
                ? cleanName(text.slice(4))
                : getQuotedTexts(text)[0] || cleanName(text)
        };
    }

    return null;
}

export function parseCommand(text) {
    const normalized = normalizeText(text);
    const lower = normalized.toLowerCase();

    if (!lower) return null;

    if (
        lower === "네" ||
        lower === "응" ||
        lower === "어" ||
        lower === "ㅇㅇ" ||
        lower === "어 변경" ||
        lower === "응 변경" ||
        lower.includes("진행")
    ) {
        return {
            action: "confirm_pending"
        };
    }

    if (
        lower.includes("내 파일") ||
        lower.includes("파일 목록") ||
        lower.includes("파일 뭐") ||
        lower === "ls"
    ) {
        return {
            action: "list_files"
        };
    }

    if (lower.includes("전체 파일") || lower.includes("tree") || lower.includes("파일 트리")) {
        return {
            action: "show_file_tree"
        };
    }

    if (lower.includes("운영체제 기능") || lower.includes("os 기능") || lower.includes("할수 있는 작업") || lower.includes("할 수 있는 작업")) {
        return {
            action: "show_os_features"
        };
    }

    if (lower.includes("터미널 명령어")) {
        return {
            action: "show_terminal_commands"
        };
    }

    if (lower.includes("각각") && lower.includes("설명")) {
        return {
            action: "explain_previous"
        };
    }

    return (
        parseCreate(normalized, lower) ||
        parseRename(normalized, lower) ||
        parseMove(normalized, lower) ||
        parseDelete(normalized, lower) ||
        parseOpenRead(normalized, lower)
    );
}
