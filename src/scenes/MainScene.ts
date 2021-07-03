import { GUI } from "dat.gui";
import { GameObjects, Scene } from "phaser";
import { Color } from "../styles/Color";
import { Scenes } from "./Scenes";

type Rect = GameObjects.Rectangle & {
    alive: boolean;
    xIndex: number;
    yIndex: number;
};

const toggleAlive = (rect: Rect) => () => {
    rect.alive = !rect.alive;
    rect.setFillStyle(rect.alive ? Color.Green : undefined);
    console.log(`cell ${rect.xIndex},${rect.yIndex} alive: ${rect.alive}`);
};

const revive = (rect: Rect) => () => {
    rect.alive = true;
    rect.setFillStyle(rect.alive ? Color.Green : undefined);
    console.log(`cell ${rect.xIndex},${rect.yIndex} revived`);
};

const die = (rect: Rect) => () => {
    rect.alive = false;
    rect.setFillStyle(rect.alive ? Color.Green : undefined);
    console.log(`cell ${rect.xIndex},${rect.yIndex} died`);
};

const author = { author: "Mirco Kraenz" };

export class MainScene extends Scene {
    private gui!: GUI;
    private generation = 0;
    private grid: Rect[][] = [];
    private history: boolean[][][] = [[]]; // complete history of the grid, history[1] is the grid after 1 iteration
    private stepSize = 2;

    public constructor() {
        super({ key: Scenes.Main });
    }

    public create(): void {
        this.input.keyboard.on("keydown-R", () => this.restart());

        this.initGrid();

        this.gui = new GUI({ closeOnTop: true, hideable: true });
        this.gui.add(this, "nextTick").name("single tick()");
        this.gui.add(this, "stepSize", 1, 100).step(1).name("step size");
        this.gui.add(this, "manyTicks").name("many ticks()");
        const about = this.gui.addFolder("about");

        about.add(author, "author");
        about.add(this, "gotoGithubRepo").name("open GitHub Repo");
    }

    public gotoGithubRepo() {
        window.open(
            "https://github.com/proSingularity/conways-game-of-life",
            "_blank"
        );
    }

    private initGrid() {
        for (let xIndex = 0; xIndex < 2000 / 50; xIndex++) {
            this.grid[xIndex] = [];
            this.history[this.generation][xIndex] = [];

            for (let yIndex = 0; yIndex < 2000 / 50; yIndex++) {
                const y = yIndex * 50;
                const x = xIndex * 50;

                const rect = this.add
                    .rectangle(x, y, 50, 50, 0)
                    .setStrokeStyle(1, Color.Red) as Rect;
                rect.alive = false;
                rect.xIndex = xIndex;
                rect.yIndex = yIndex;
                this.grid[xIndex][yIndex] = rect;
                this.history[this.generation][xIndex][yIndex] = rect.alive;

                rect.setInteractive().on("pointerup", toggleAlive(rect));
            }
        }
    }

    public manyTicks() {
        for (let i = 0; i < this.stepSize; i++) {
            this.nextTick();
        }
    }

    public nextTick() {
        this.pushCurrentGridToHistory();

        this.generation++;
        console.log(`starting iteration ${this.generation}`);

        const grid = this.history[this.generation - 1];
        for (let x = 0; x < grid.length; x++) {
            for (let y = 0; y < grid[0].length; y++) {
                const isBorderCell =
                    !x || !y || x === grid.length - 1 || y === grid.length - 1;
                if (isBorderCell) {
                    continue;
                }

                // important manipulate the cell from the next iteration
                const cell = this.grid[x][y];

                const top = grid[x][y - 1];
                const right = grid[x + 1][y];
                const bottom = grid[x][y + 1];
                const left = grid[x - 1][y];
                const topLeft = grid[x - 1][y - 1];
                const topRight = grid[x + 1][y - 1];
                const bottomRight = grid[x + 1][y + 1];
                const bottomLeft = grid[x - 1][y + 1];
                const neightbors = [
                    top,
                    right,
                    bottom,
                    left,
                    topLeft,
                    topRight,
                    bottomRight,
                    bottomLeft,
                ];

                const aliveNeighbors = neightbors.filter((c) => c).length;

                const isUnderpopulated = aliveNeighbors < 2;
                const overpopulated = aliveNeighbors > 3;
                const cellSurvives =
                    (cell.alive && aliveNeighbors === 2) ||
                    aliveNeighbors === 3;
                if (isUnderpopulated || overpopulated) {
                    die(cell)();
                }
                if (!cell.alive && aliveNeighbors === 3) {
                    revive(cell)();
                }
            }
        }
    }

    private pushCurrentGridToHistory() {
        this.history[this.generation] = [];
        for (let x = 0; x < this.grid.length; x++) {
            this.history[this.generation][x] = [];
            for (let y = 0; y < this.grid[0].length; y++) {
                this.history[this.generation][x][y] = this.grid[x][y].alive;
            }
        }
    }

    private restart() {
        console.log("restarted");
        this.gui.destroy();
        this.scene.restart();
    }
}
