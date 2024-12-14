// Author: www.mahdi7s.com

// Utility math helper
const MathH = {
    clamp(num, min, max) {
        return Math.min(max, Math.max(num, min));
    }
};

// Class representing the user data associated with a body
class BodyUserData {
    constructor(objectRoll, fullHealth) {
        this.objectRoll = objectRoll;
        this.fullHealth = fullHealth;
        this.currentHealth = fullHealth;
        this.isDead = false;
        this.isContacted = false;
    }

    getObjectRoll() {
        return this.objectRoll;
    }

    getFullHealth() {
        return this.fullHealth;
    }

    getHealth() {
        return this.currentHealth;
    }

    damage(impulse) {
        this.currentHealth -= impulse;
        this.isDead = this.currentHealth <= 0;
    }
}

// Game object roles (enum-like structure)
const GameObjectRoll = Object.freeze({
    Enemy: "ENEMY!",
    Wood: "Wood!",
    Bird: "BIRD!"
});

// Box2D setup and helper functions
const b2 = (() => {
    let deadsCount = 0;
    let userScore = 0;
    let world;
    let enableDebugDraw = false;
    const bodies = [];
    const PTMRatio = 30.0; // Pixels to meters ratio

    // Conversion helpers
    const toWorld = (n) => n / PTMRatio;
    const toScreen = (n) => n * PTMRatio;
    const b2AngleToCCRotation = (n) => -cc.RADIANS_TO_DEGREES(n);
    const CCRotationToB2Angle = (n) => cc.DEGREES_TO_RADIANS(-n);

    // Contact listener for handling collisions
    const contactListener = new Box2D.Dynamics.b2ContactListener();

    contactListener.BeginContact = (contact) => {
        const bodyA = contact.GetFixtureA().GetBody();
        const bodyB = contact.GetFixtureB().GetBody();

        const setContacted = (data) => {
            if (data) data.isContacted = true;
        };

        setContacted(bodyA.GetUserData());
        setContacted(bodyB.GetUserData());
    };

    contactListener.PostSolve = (contact, impulse) => {
        const bodyA = contact.GetFixtureA().GetBody();
        const bodyB = contact.GetFixtureB().GetBody();
        const bAData = bodyA.GetUserData();
        const bBData = bodyB.GetUserData();

        const imp0 = impulse.normalImpulses[0];
        if (imp0 <= 2) return; // Ignore small impulses

        const applyDamage = (bodyData) => {
            if (!bodyData || (bodyData.getHealth() === bodyData.getFullHealth() && imp0 < 12)) return;

            const objRoll = bodyData.getObjectRoll();
            if (objRoll === GameObjectRoll.Enemy || objRoll === GameObjectRoll.Wood) {
                bodyData.damage(imp0);
            }
        };

        applyDamage(bAData);
        applyDamage(bBData);
    };

    return {
        toWorld,
        toScreen,

        initWorld() {
            deadsCount = userScore = 0;
            world = new Box2D.Dynamics.b2World(new Box2D.Common.Math.b2Vec2(0, -10), true);
            world.SetContinuousPhysics(true);
            world.SetContactListener(contactListener);
            bodies.length = 0;
        },

        getUserScore() {
            return userScore;
        },

        enablePhysicsFor(desc) {
            const bodyDef = new Box2D.Dynamics.b2BodyDef();

            // Determine body type
            bodyDef.type = desc.type === "static" ? Box2D.Dynamics.b2Body.b2_staticBody :
                desc.type === "dynamic" ? Box2D.Dynamics.b2Body.b2_dynamicBody :
                Box2D.Dynamics.b2Body.b2_kinematicBody;

            const scale = {
                x: desc.sprite.getScaleX(),
                y: desc.sprite.getScaleY()
            };

            const anch = desc.sprite.getAnchorPointInPoints();
            const anchPoint = cc.p(anch.x * scale.x, anch.y * scale.y);
            const position = desc.sprite.getPosition();
            const contentSize = desc.sprite.getContentSize();
            const size = {
                width: contentSize.width * scale.x,
                height: contentSize.height * scale.y
            };

            const center = cc.p(position.x - anchPoint.x + size.width / 2, position.y - anchPoint.y + size.height / 2);

            bodyDef.position.Set(toWorld(center.x), toWorld(center.y));
            bodyDef.angle = CCRotationToB2Angle(desc.sprite.getRotation());

            const fixDef = new Box2D.Dynamics.b2FixtureDef();
            switch (desc.shape) {
                case "circle":
                    fixDef.shape = new Box2D.Collision.Shapes.b2CircleShape(toWorld(desc.radius || size.height / 2));
                    break;
                case "box":
                    fixDef.shape = new Box2D.Collision.Shapes.b2PolygonShape();
                    fixDef.shape.SetAsBox(toWorld(size.width) / 2, toWorld(size.height) / 2);
                    break;
            }

            fixDef.density = desc.density || 1;
            fixDef.friction = desc.friction || 0.5;
            fixDef.restitution = desc.restitution || 0.1;

            const body = world.CreateBody(bodyDef);
            body.CreateFixture(fixDef);

            if (desc.userData) body.SetUserData(desc.userData);

            body.sprite = desc.sprite;
            desc.sprite.body = body;

            bodies.push(body);
        },

        simulate() {
            world.Step(1 / 60, 10, 10); // Fixed time step, velocity, and position iterations

            if (enableDebugDraw) world.DrawDebugData();

            bodies.forEach((body, index) => {
                const bodyData = body.GetUserData();

                if (bodyData && bodyData.isDead) {
                    world.DestroyBody(body);
                    userScore = (++deadsCount) * 1000;
                    body.sprite.runAction(cc.FadeOut.create(0.5));
                    body.SetUserData(null);
                    bodies.splice(index, 1);
                    return;
                }

                const bPos = body.GetPosition();
                const bAngle = body.GetAngle();

                const scale = {
                    x: body.sprite.getScaleX(),
                    y: body.sprite.getScaleY()
                };
                const anch = body.sprite.getAnchorPointInPoints();
                const anchPoint = cc.p(anch.x * scale.x, anch.y * scale.y);
                const contentSize = body.sprite.getContentSize();
                const size = {
                    width: contentSize.width * scale.x,
                    height: contentSize.height * scale.y
                };

                body.sprite.setPosition(cc.p(
                    toScreen(bPos.x) + anchPoint.x - size.width / 2,
                    toScreen(bPos.y) + anchPoint.y - size.height / 2
                ));
                body.sprite.setRotation(b2AngleToCCRotation(bAngle));
            });

            world.ClearForces();
        },

        debugDraw(enable) {
            enableDebugDraw = enable;
            if (enableDebugDraw) {
                const debugDraw = new Box2D.Dynamics.b2DebugDraw();
                debugDraw.SetSprite(document.querySelector("canvas").getContext("2d"));
                debugDraw.SetDrawScale(PTMRatio);
                debugDraw.SetFillAlpha(0.5);
                debugDraw.SetLineThickness(1.0);
                debugDraw.SetFlags(Box2D.Dynamics.b2DebugDraw.e_shapeBit | Box2D.Dynamics.b2DebugDraw.e_jointBit);
                world.SetDebugDraw(debugDraw);
            }
        }
    };
})();
