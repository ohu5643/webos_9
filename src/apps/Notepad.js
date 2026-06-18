export default class Notepad {

    constructor(wm){

        this.wm = wm;

    }

    open(){

        this.wm.createWindow(

            "Notepad",

            `

            <textarea

                style="
                    width:100%;
                    height:300px;
                "

            ></textarea>

            `
        );

    }

}