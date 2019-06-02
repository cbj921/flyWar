

cc.Class({
    extends: cc.Component,

    properties: {
        startBulletAttack: 0, // 子弹攻击力
        startImpactAttack: 0, // 撞击攻击力
        startHealth: 0,  // 初始血量
        startBulletSpeed: 0, // 初始子弹速度
        bulletFre: 0, // 子弹频率

        moveHorizontalDuration: 0,
        moveVenticalDuration: 0,

        moveHorizontalDistance: 0,
        moveVenticalDistance: 0,

        healthBar: cc.ProgressBar,
        bulletPrefab:cc.Prefab,
    },


    initData() {
        this.UFOObject = JSON.parse(cc.sys.localStorage.getItem("UFOObject")); // 获取全局对象
        if (this.UFOObject == null) {
            this.UFOObject = {
                bulletAttack: this.startBulletAttack, // 子弹攻击力
                impactAttack: this.startImpactAttack, // 撞击攻击力
                health: this.startHealth,  // 初始血量
                bulletSpeed: this.startBulletSpeed, // 初始子弹速度
                bulletFre: this.bulletFre, // 子弹频率
                coin:100,
            };
            cc.sys.localStorage.setItem("UFOObject", JSON.stringify(this.UFOObject));
            this.UFOObject = JSON.parse(cc.sys.localStorage.getItem("UFOObject")); // 获取全局对象
        } // 初始化数据

        this.mainPlaneData = JSON.parse(cc.sys.localStorage.getItem("mainPlaneObject"));// 获取飞机数据
    },

    moveAction() {
        this.randomPosition(380, -400); // 不要问我为什么是这个数值，我测试出来的

        let moveRight = cc.moveBy(this.moveHorizontalDuration, cc.v2(this.moveHorizontalDistance, 0)).easing(cc.easeCubicActionOut());
        let moveLeft = cc.moveBy(this.moveHorizontalDuration, cc.v2(-this.moveHorizontalDistance, 0)).easing(cc.easeCubicActionOut());

        let moveHorizontal = cc.repeat(cc.sequence(moveRight, moveLeft), 5); // 左右横移
        let moveVentical = cc.moveTo(this.moveVenticalDuration, cc.v2(this.node.x, this.moveVenticalDistance));  // 移动到（0，-1100）的位置

        let moveAction = cc.spawn(moveHorizontal, moveVentical);

        this.backAction = cc.callFunc(()=>{
            // 到底部回到顶部回调函数
            this.randomPosition(380, -400); 
            moveVentical = cc.moveTo(this.moveVenticalDuration, cc.v2(this.node.x, this.moveVenticalDistance));  // 重新设置 x 值
            moveAction = cc.spawn(moveHorizontal, moveVentical);
            this.node.runAction(cc.sequence(moveAction,this.backAction));
        });

        this.node.runAction(cc.sequence(moveAction,this.backAction));
        //this.runAndBackAction(moveAction); //bug
    },
    
    randomPosition(max, min) {
        //随机出现位置
        let posY = 1020; // 起始纵坐标固定
        let posX = Math.floor(Math.random() * (max - min)) + min; // 
        this.node.setPosition(posX, posY);
    },

    initHealthBar(){
        // 更新血条，让血回满
        // 初始化血量
        this.varHealth=this.UFOObject.health;
        this.healthBar.progress = 1;
    },

    updateHealthBar(){
        let ratio = this.varHealth/this.UFOObject.health;
        this.healthBar.progress = ratio;
        if(ratio == 0){
            this.node.parent = null;
            this.node.destroy();
        }
    },
    //子弹
    bulletInit(bulletPrefab){
        this.bulletPool = new cc.NodePool();
        this.bulletArray = [];
        let initCount = 10;
        for(let i=0;i<initCount;i++){
            let bullet = cc.instantiate(bulletPrefab);
            this.bulletPool.put(bullet);
        }
    },

    creatBullet(){
        this.bulletCallback = ()=>{
            // 计时器回调函数
            let bullet = null;
            if (this.bulletPool.size() > 0) { // 通过 size 接口判断对象池中是否有空闲的对象
                bullet = this.bulletPool.get();
            } else { // 如果没有空闲对象，也就是对象池中备用对象不够时，我们就用 cc.instantiate 重新创建
                bullet = cc.instantiate(this.bulletPrefab);
            }
            bullet.parent = this.node.parent; // 将生成的子弹加入canvas节点
            bullet.position = cc.v2(this.node.x,this.node.y);
            this.bulletAction(bullet);
        };

        this.schedule(this.bulletCallback,this.UFOObject.bulletFre);//
        
    },

    bulletAction(bulletNode){
        let duration = (this.node.y+1100)/(this.UFOObject.bulletSpeed*100);  // 计算时间，这样不管在哪个位置发射子弹速度都一样了
        this.moveAction = cc.moveTo(duration,cc.v2(this.node.x,-1100)); // 初始位置是0
        this.finished = cc.callFunc(()=>{
            if(this.bulletPool == null){ // 因为飞船没了后，对象池也没了
                bulletNode.destroy();
            }else{
                this.bulletPool.put(bulletNode);
            }
        });
        let shootAction = cc.sequence(this.moveAction,this.finished);
        bulletNode.runAction(shootAction);
    },
    /**
    * 当碰撞产生的时候调用
    * @param  {Collider} other 产生碰撞的另一个碰撞组件
    * @param  {Collider} self  产生碰撞的自身的碰撞组件
    */
    onCollisionEnter(other, self) {
        // 敌机的碰撞tag暂时为，飞机：0，普通子弹：1
        if(other.tag == 0){
            this.node.destroy();
        }
        if(other.tag == 1){
            //被子弹射中
            this.varHealth -= this.mainPlaneData.mainWeapon.attackNumber;
            if(this.varHealth<0){
                this.varHealth =0;
            }
        }
    },


    onLoad() {
        this.initData();
        this.initHealthBar();
        this.moveAction();
        this.bulletInit(this.bulletPrefab);
        this.creatBullet();
    },

    start() {

    },

    update(dt) {
        this.updateHealthBar();
    },
});
