import { GUI } from "dat.gui";
import { Cameras, GameObjects, Scene } from "phaser";
import { Color } from "../styles/Color";
import { Scenes } from "./Scenes";

type Rect = GameObjects.Rectangle & {
    alive: boolean;
    xIndex: number;
    yIndex: number;
};

const config = {
    author: "Mirco Kraenz",
    debug: false,
};

const log = (...args: Parameters<typeof console["log"]>) => {
    if (config.debug) console.log(args);
};

const toggleAlive = (rect: Rect) => () => {
    rect.alive = !rect.alive;
    rect.setFillStyle(rect.alive ? Color.Green : undefined);
    log(`cell ${rect.xIndex},${rect.yIndex} alive: ${rect.alive}`);
};

const revive = (rect: Rect) => () => {
    rect.alive = true;
    rect.setFillStyle(rect.alive ? Color.Green : undefined);
    log(`cell ${rect.xIndex},${rect.yIndex} revived`);
};

const die = (rect: Rect) => () => {
    rect.alive = false;
    rect.setFillStyle(rect.alive ? Color.Green : undefined);
    log(`cell ${rect.xIndex},${rect.yIndex} dead`);
};

const maxCam = 4096;
const maxCellsPerRow = 5000 / 50;

export class MainScene extends Scene {
    // using definite assignment operator + initialization in create() so that on restart() everything gets newly initiated automatically
    private gui!: GUI;
    private generation!: number;
    private grid!: Rect[][];
    private history!: boolean[][][]; // complete history of the grid, history[1] is the grid after 1 iteration
    private stepSize!: number;
    private controls!: Cameras.Controls.SmoothedKeyControl;

    public constructor() {
        super({ key: Scenes.Main });
    }

    public create(): void {
        this.generation = 0;
        this.grid = [];
        this.history = [[]];
        this.stepSize = 1;

        this.addCameraControls();
        this.addMouseZoomControls();

        this.input.keyboard.on("keydown-R", () => this.restart());

        this.initGrid();
        this.setupGUI();
    }

    private addCameraControls() {
        const cursors = this.input.keyboard.createCursorKeys();
        const controlConfig = {
            camera: this.cameras.main,
            left: cursors.left,
            right: cursors.right,
            up: cursors.up,
            down: cursors.down,
            acceleration: 1,
            drag: 1,
            maxSpeed: 1.0,
        };
        this.controls = new Phaser.Cameras.Controls.SmoothedKeyControl(
            controlConfig
        );
        this.cameras.main.setBounds(0, 0, maxCam, maxCam).setZoom(1);
    }

    private addMouseZoomControls() {
        this.input.on(
            "wheel",
            (
                pointer: never,
                gameobject: never,
                dx: number,
                dy: number,
                dz: number
            ) => {
                const zoomStepSize = 0.1;
                const maxZoom = 2;
                const minZoom = 0.3;

                const isZoomOut = dy > 0;
                const isZoomIn = dy < 0;
                if (
                    isZoomOut &&
                    this.cameras.main.zoom > minZoom + zoomStepSize
                ) {
                    this.cameras.main.zoom -= zoomStepSize;
                }
                if (isZoomIn && this.cameras.main.zoom < maxZoom) {
                    this.cameras.main.zoom += zoomStepSize;
                }
            }
        );
    }

    public update(time: number, delta: number) {
        this.controls.update(delta);
    }

    private setupGUI() {
        this.gui = new GUI({ closeOnTop: true, hideable: true });
        this.gui.add(this, "nextTick").name("single tick()");
        this.gui.add(this, "undo").name("undo()");
        this.gui.add(this, "stepSize", 1, 100).step(1).name("step size");
        this.gui.add(this, "manyTicks").name("many ticks()");
        this.gui.add(this, "undoMany").name("undo many()");
        const more = this.gui.addFolder("more");

        more.add(this, "restart").name("reset all()");
        more.add(config, "debug").name("print debug logs");
        more.add(config, "author");
        more.add(this, "gotoGithubRepo").name("open GitHub Repo");
        more.add(this, "gotoWikipedia").name("patterns on Wiki");
    }

    private initGrid() {
        for (let xIndex = 0; xIndex < maxCellsPerRow; xIndex++) {
            this.grid[xIndex] = [];
            this.history[this.generation][xIndex] = [];

            for (let yIndex = 0; yIndex < maxCellsPerRow; yIndex++) {
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

    public undoMany() {
        for (let i = 0; i < this.stepSize; i++) {
            this.undo();
        }
    }

    public nextTick() {
        this.pushCurrentGridToHistory();

        this.generation++;
        log(`starting iteration ${this.generation}`);

        const prevGrid = this.history[this.generation - 1];
        for (let x = 1; x < prevGrid.length - 1; x++) {
            for (let y = 1; y < prevGrid[0].length - 1; y++) {
                // important manipulate the cell from the next iteration
                const cell = this.grid[x][y];

                const neightbors = this.getNeighbors(prevGrid, x, y);
                const aliveNeighbors = neightbors.filter((c) => c).length;

                const underpopulated = aliveNeighbors < 2;
                const overpopulated = aliveNeighbors > 3;
                const cellSurvives =
                    (cell.alive && aliveNeighbors === 2) ||
                    aliveNeighbors === 3;
                const idealGrowthConditions =
                    !cell.alive && aliveNeighbors === 3;

                if (underpopulated || overpopulated) die(cell)();
                if (idealGrowthConditions) revive(cell)();
            }
        }
    }

    private getNeighbors(grid: boolean[][], x: number, y: number) {
        const top = grid[x][y - 1];
        const right = grid[x + 1][y];
        const bottom = grid[x][y + 1];
        const left = grid[x - 1][y];
        const topLeft = grid[x - 1][y - 1];
        const topRight = grid[x + 1][y - 1];
        const bottomRight = grid[x + 1][y + 1];
        const bottomLeft = grid[x - 1][y + 1];
        return [
            top,
            right,
            bottom,
            left,
            topLeft,
            topRight,
            bottomRight,
            bottomLeft,
        ];
    }

    public undo() {
        if (this.generation === 0) return;
        this.grid.forEach((row) =>
            row.forEach((cell) => {
                const previouslyAlive =
                    this.history[this.generation - 1][cell.xIndex][cell.yIndex];
                if (previouslyAlive) revive(cell)();
                else die(cell)();
            })
        );
        this.generation--;
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

    public gotoGithubRepo() {
        window.open(
            "https://github.com/proSingularity/conways-game-of-life",
            "_blank"
        );
    }

    public gotoWikipedia() {
        window.open(
            "https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life#Examples_of_patterns",
            "_blank"
        );
    }

    private restart() {
        log("restarted");
        this.gui.destroy();
        this.scene.restart();
    }
}
