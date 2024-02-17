import { ui_h } from "./template";
import Frame from "./frame";

class GeneratorHelper {
constructor(data) {
    this.frames = []
    for (let frame_name in data) {
        this.frames.push(new Frame(frame_name, this.frames.length, data[frame_name]))
    }
}

toUiH() {
    return ui_h(this.frames)
}

}

export default GeneratorHelper
