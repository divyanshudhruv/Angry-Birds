var CMenu = cc.Sprite.extend({
    defaultScale: 0.8,
    hovered: false,
    boundingBox: null,
    onClickCallback: null,

    ctor: function (tex) {
        this._super();
        this.initWithTexture(tex);
        this.setScale(this.defaultScale);
    },

    onClick: function (callback) {
        this.onClickCallback = callback;
    },

    handleTouches: function (touch, evt) {
        if (this.hovered && this.onClickCallback) {
            this.onClickCallback();
        }
    },

    handleTouchesMoved: function (touch, evt) {
        var point = touch[0].getLocation();
        this.boundingBox || (this.boundingBox = this.getBoundingBox());

        if (cc.Rect.CCRectContainsPoint(this.boundingBox, point)) {
            if (!this.hovered) {
                this.hovered = true;
                this.runAction(cc.ScaleTo.create(0.01, 1));
            }
        } else if (this.hovered) {
            this.hovered = false;
            this.runAction(cc.ScaleTo.create(0.01, this.defaultScale));
        }
    },

    handleTouchesEnded: function (touch, evt) {}
});

var GameLayer = cc.Layer.extend({
    birdSprite: null,
    isDraggingSling: false,
    birdStartPos: cc.p(260, 440.5),
    slingRadius: { min: 20, max: 80 },
    slingAngle: { min: cc.DEGREES_TO_RADIANS(250), max: cc.DEGREES_TO_RADIANS(295) },
    smokeDistance: 16,
    menus: [],
    lastSmoke: null,
    slingRubber1: null,
    slingRubber2: null,
    slingRubber3: null,

    getTexture: function (name) {
        return cc.TextureCache.getInstance().addImage('sprites/' + name + '.png');
    },

    addObject: function (desc) {
        var sprite = cc.Sprite.createWithTexture(this.getTexture(desc.name));
        sprite.setAnchorPoint(desc.anchor || cc.p(0.5, 0.5));
        sprite.setScaleX(desc.scaleX || desc.scale || 1);
        sprite.setScaleY(desc.scaleY || desc.scale || 1);
        sprite.setRotation(desc.rotation || 0);
        sprite.setPosition(cc.p(desc.x || 0, desc.y || 0));

        if (desc.shape) {
            b2.enablePhysicsFor({
                type: desc.type,
                shape: desc.shape,
                sprite: sprite,
                radius: desc.radius,
                density: desc.density,
                userData: desc.userData
            });
        }

        this.addChild(sprite, desc.z || 0);
        return sprite;
    },

    init: function () {
        this._super();
        this.removeAllChildrenWithCleanup(true);
        this.setTouchEnabled(true);

        var director = cc.Director.getInstance();
        var winSize = director.getWinSize();

        b2.initWorld();

        this.createBackground(winSize);
        this.createGround();
        this.createPlatform();
        this.createSlingshots();
        this.createWoodenBlocks();
        this.createEnemies();

        this.birdSprite = this.addObject({
            name: "bird",
            x: 200,
            y: 345,
            z: 1
        });

        this.setupSlingRubbers();
        this.setupTopMenu(winSize);

        var action = cc.Spawn.create(cc.RotateBy.create(1.5, 360), cc.JumpTo.create(1.5, this.birdStartPos, 100, 1));
        this.birdSprite.runAction(action);

        this.scheduleUpdate();
    },

    createBackground: function (winSize) {
        this.addObject({
            name: "bg",
            scaleY: 0.8,
            anchor: cc.p(0, 0),
            z: -1
        });
    },

    createGround: function () {
        this.addObject({
            name: "ground",
            scaleX: 2.5,
            anchor: cc.p(0, 0),
            type: "static",
            shape: "box",
            density: 0
        });
    },

    createPlatform: function () {
        this.addObject({
            name: "platform",
            y: 30,
            scale: 1.5,
            anchor: cc.p(0, 0),
            type: "static",
            shape: "box",
            density: 0
        });
    },

    createSlingshots: function () {
        this.addObject({
            name: "sling1",
            x: 284.5,
            y: 319.5,
            scale: 0.7,
            anchor: cc.p(1, 0)
        });
        this.addObject({
            name: "sling2",
            x: 268.5,
            y: 376.5,
            scale: 0.7,
            anchor: cc.p(1, 0),
            z: 3
        });
    },

    createWoodenBlocks: function () {
        var woodPositions = [
            { x: 840.5, y: 71 }, { x: 1017.5, y: 71 },
            { x: 931.5, y: 131.5, scaleX: 1.3 }, { x: 931.5, y: 251.5, scaleX: 1.3 },
            { x: 880, y: 330, rotation: -40, scaleX: 0.8 }, { x: 980, y: 330, rotation: 40, scaleX: 0.8 },
            { x: 840.5, y: 200.5 }, { x: 1017.5, y: 200.5 },
            { x: 930, y: 300 }
        ];

        woodPositions.forEach(function (pos) {
            this.addObject({
                name: "wood1",
                x: pos.x,
                y: pos.y,
                scaleX: pos.scaleX || 1,
                scaleY: pos.scaleY || 1,
                rotation: pos.rotation || 0,
                type: "dynamic",
                shape: "box",
                userData: new BodyUserData(GameObjectRoll.Wood, 2000)
            });
        }, this);
    },

    createEnemies: function () {
        this.addObject({
            name: "enemy",
            x: 931.5,
            y: 71,
            type: "dynamic",
            shape: "circle",
            density: 2,
            userData: new BodyUserData(GameObjectRoll.Enemy, 400)
        });
        this.addObject({
            name: "enemy",
            x: 931.5,
            y: 180,
            type: "dynamic",
            shape: "circle",
            density: 2,
            userData: new BodyUserData(GameObjectRoll.Enemy, 400)
        });
    },

    setupSlingRubbers: function () {
        this.slingRubber1 = this.addObject({
            name: "sling3",
            x: 278,
            y: 436,
            scaleY: 0.7,
            scaleX: 0,
            anchor: cc.p(1, 0.5),
            z: 0
        });
        this.slingRubber2 = this.addObject({
            name: "sling3",
            x: 250,
            y: 440,
            scaleY: 0.7,
            scaleX: 0,
            anchor: cc.p(1, 0.5),
            z: 2
        });
    },

    setupTopMenu: function (winSize) {
        var margin = 25;
        var backMenu = new CMenu(this.getTexture("menu_back"));
        backMenu.setPosition(cc.p(margin, winSize.height - margin));
        backMenu.onClick(function () {
            window.location.href = "https://code.org";
        });
        this.addChild(backMenu);
        this.menus.push(backMenu);

        var refreshMenu = new CMenu(this.getTexture("menu_refresh"));
        refreshMenu.setPosition(cc.p(70, winSize.height - margin));
        refreshMenu.onClick(function () {
            this.init();
        }.bind(this));
        this.addChild(refreshMenu);
        this.menus.push(refreshMenu);

        this.setupScoreLabel(winSize);
    },

    setupScoreLabel: function (winSize) {
        var scoreLabel = cc.LabelTTF.create("0", "fantasy", 20, cc.size(0, 0), cc.TEXT_ALIGNMENT_LEFT);
        scoreLabel.setPosition(cc.p(winSize.width - 80, winSize.height));
        scoreLabel.schedule(function () {
            var showingScore = parseInt(scoreLabel.getString());
            if (showingScore < b2.getUserScore()) {
                scoreLabel.setString((showingScore + 5).toString());
            }
        });
        this.addChild(scoreLabel, 5);
    },

    update: function (dt) {
        b2.simulate();

        if (this.birdSprite.body) {
            var bData = this.birdSprite.body.GetUserData();
            if (!bData || bData.isContacted) return;

            var birdPos = this.birdSprite.getPosition();
            var vector = cc.pSub(birdPos, (this.lastSmoke && this.lastSmoke.getPosition()) || cc.p(0, 
