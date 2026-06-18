export async function getRuntimeContext(

    fs,
    auth

){

    const user =
        auth.currentUser;


    if(!user){

        return null;

    }


    const nodes =
        await fs.getNodes(
            user.uid
        );


    const files =
        nodes.map(

            node => {

                return {

                    name:
                        node.name,

                    type:
                        node.type

                };

            }

        );


    const context = {

        osName:
            "WebOS",

        installedApps:[

            "Explorer",

            "Notepad",

            "AI Assistant",

            "Terminal"

        ],

        terminalCommands:[

            "help",

            "ls",

            "mkdir",

            "touch",

            "clear"

        ],

        currentFiles:
            files,

        currentUser:
            user.email

    };


    return context;

}