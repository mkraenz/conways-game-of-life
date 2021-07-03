import { Types } from "phaser";
import { MainScene } from "./scenes/MainScene";

export const gameConfig: Types.Core.GameConfig = {
    scene: MainScene,
    type: Phaser.AUTO,
    dom: {
        createContainer: true,
    },
    scale: {
        parent: "game",
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: window.innerWidth * window.devicePixelRatio,
        height: window.innerHeight * window.devicePixelRatio,
    },
};
