import * as THREE from 'three';

class XCOMGame {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        
        this.gridSize = 12;
        this.tileSize = 1;
        this.grid = [];
        this.soldiers = [];
        this.enemies = [];
        this.currentTurn = 'player';
        this.selectedUnit = null;
        this.actionPointsLeft = 2;
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.cameraRadius = 15;
        this.cameraAngle = { theta: Math.PI / 4, phi: Math.PI / 6 };
        this.cameraCenter = new THREE.Vector3(this.gridSize / 2, 0, this.gridSize / 2);
        
        this.initializeScene();
        this.createGrid();
        this.createUnits();
        this.setupControls();
        this.setupUI();
        this.animate();
    }
    
    initializeScene() {
        this.scene.background = new THREE.Color(0x2a2a2a);
        
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        this.scene.add(directionalLight);
        
        this.updateCameraPosition();
    }
    
    createGrid() {
        const gridGroup = new THREE.Group();
        
        for (let x = 0; x < this.gridSize; x++) {
            this.grid[x] = [];
            for (let z = 0; z < this.gridSize; z++) {
                this.grid[x][z] = {
                    x: x,
                    z: z,
                    occupied: false,
                    cover: Math.random() < 0.2,
                    mesh: null
                };
                
                const geometry = new THREE.PlaneGeometry(this.tileSize * 0.95, this.tileSize * 0.95);
                const material = new THREE.MeshLambertMaterial({ 
                    color: this.grid[x][z].cover ? 0x8b4513 : 0x404040,
                    transparent: true,
                    opacity: 0.8
                });
                
                const tile = new THREE.Mesh(geometry, material);
                tile.rotation.x = -Math.PI / 2;
                tile.position.set(x, 0, z);
                tile.userData = { gridX: x, gridZ: z, type: 'tile' };
                
                this.grid[x][z].mesh = tile;
                gridGroup.add(tile);
                
                if (this.grid[x][z].cover) {
                    const coverGeometry = new THREE.BoxGeometry(0.8, 1.5, 0.8);
                    const coverMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
                    const cover = new THREE.Mesh(coverGeometry, coverMaterial);
                    cover.position.set(x, 0.75, z);
                    gridGroup.add(cover);
                }
            }
        }
        
        this.scene.add(gridGroup);
    }
    
    createUnits() {
        for (let i = 0; i < 3; i++) {
            const soldier = this.createUnit('soldier', 1, i + 1, 0x0066cc);
            this.soldiers.push(soldier);
            
            const enemy = this.createUnit('enemy', this.gridSize - 2, this.gridSize - 2 - i, 0xcc0000);
            this.enemies.push(enemy);
        }
        
        this.selectedUnit = this.soldiers[0];
        this.highlightUnit(this.selectedUnit);
    }
    
    createUnit(type, x, z, color) {
        const geometry = new THREE.CapsuleGeometry(0.3, 1.2);
        const material = new THREE.MeshLambertMaterial({ color: color });
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.set(x, 0.8, z);
        mesh.userData = { 
            type: type,
            gridX: x,
            gridZ: z,
            health: 100,
            actionPoints: 2,
            maxActionPoints: 2
        };
        
        this.grid[x][z].occupied = true;
        this.scene.add(mesh);
        
        return mesh;
    }
    
    highlightUnit(unit) {
        this.clearHighlights();
        
        if (unit) {
            const geometry = new THREE.RingGeometry(0.4, 0.6, 8);
            const material = new THREE.MeshBasicMaterial({ 
                color: 0xffff00,
                transparent: true,
                opacity: 0.7
            });
            const highlight = new THREE.Mesh(geometry, material);
            highlight.rotation.x = -Math.PI / 2;
            highlight.position.set(unit.userData.gridX, 0.05, unit.userData.gridZ);
            highlight.userData.type = 'highlight';
            
            this.scene.add(highlight);
            this.showMovementRange(unit);
        }
    }
    
    showMovementRange(unit) {
        const range = unit.userData.actionPoints >= 2 ? 3 : 1.5;
        
        for (let x = 0; x < this.gridSize; x++) {
            for (let z = 0; z < this.gridSize; z++) {
                const distance = Math.abs(x - unit.userData.gridX) + Math.abs(z - unit.userData.gridZ);
                
                if (distance <= range && !this.grid[x][z].occupied) {
                    const geometry = new THREE.RingGeometry(0.35, 0.45, 8);
                    const material = new THREE.MeshBasicMaterial({ 
                        color: distance <= 1.5 ? 0x00ff00 : 0xffaa00,
                        transparent: true,
                        opacity: 0.5
                    });
                    const moveTile = new THREE.Mesh(geometry, material);
                    moveTile.rotation.x = -Math.PI / 2;
                    moveTile.position.set(x, 0.03, z);
                    moveTile.userData.type = 'movement';
                    
                    this.scene.add(moveTile);
                }
            }
        }
    }
    
    clearHighlights() {
        const toRemove = [];
        this.scene.traverse(child => {
            if (child.userData.type === 'highlight' || child.userData.type === 'movement') {
                toRemove.push(child);
            }
        });
        toRemove.forEach(obj => this.scene.remove(obj));
    }
    
    moveUnit(unit, targetX, targetZ) {
        const distance = Math.abs(targetX - unit.userData.gridX) + Math.abs(targetZ - unit.userData.gridZ);
        const isDash = distance > 1.5;
        
        this.grid[unit.userData.gridX][unit.userData.gridZ].occupied = false;
        this.grid[targetX][targetZ].occupied = true;
        
        unit.userData.gridX = targetX;
        unit.userData.gridZ = targetZ;
        unit.position.set(targetX, 0.8, targetZ);
        
        unit.userData.actionPoints -= isDash ? 2 : 1;
        
        this.highlightUnit(unit);
        this.updateUI();
    }
    
    setupControls() {
        this.renderer.domElement.addEventListener('mousedown', (event) => {
            this.isDragging = true;
            this.previousMousePosition = { x: event.clientX, y: event.clientY };
        });
        
        this.renderer.domElement.addEventListener('mousemove', (event) => {
            if (this.isDragging) {
                const deltaX = event.clientX - this.previousMousePosition.x;
                const deltaY = event.clientY - this.previousMousePosition.y;
                
                this.cameraAngle.theta -= deltaX * 0.01;
                this.cameraAngle.phi += deltaY * 0.01;
                
                this.cameraAngle.phi = Math.max(0.1, Math.min(Math.PI / 2, this.cameraAngle.phi));
                
                this.updateCameraPosition();
                
                this.previousMousePosition = { x: event.clientX, y: event.clientY };
            }
        });
        
        this.renderer.domElement.addEventListener('mouseup', (event) => {
            if (this.isDragging) {
                this.isDragging = false;
                
                this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
                this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
                
                this.raycaster.setFromCamera(this.mouse, this.camera);
                const intersects = this.raycaster.intersectObjects(this.scene.children, true);
                
                if (intersects.length > 0) {
                    const obj = intersects[0].object;
                    
                    if (obj.userData.type === 'soldier' && this.currentTurn === 'player') {
                        this.selectedUnit = obj;
                        this.highlightUnit(obj);
                        this.updateUI();
                    } else if (obj.userData.type === 'enemy' && this.selectedUnit && this.currentTurn === 'player' && this.selectedUnit.userData.actionPoints > 0) {
                        this.attackUnit(this.selectedUnit, obj);
                    } else if (obj.userData.type === 'tile' && this.selectedUnit && this.currentTurn === 'player') {
                        const targetX = obj.userData.gridX;
                        const targetZ = obj.userData.gridZ;
                        const distance = Math.abs(targetX - this.selectedUnit.userData.gridX) + 
                                       Math.abs(targetZ - this.selectedUnit.userData.gridZ);
                        const maxRange = this.selectedUnit.userData.actionPoints >= 2 ? 3 : 1.5;
                        
                        if (distance <= maxRange && !this.grid[targetX][targetZ].occupied) {
                            this.moveUnit(this.selectedUnit, targetX, targetZ);
                        }
                    }
                }
            }
        });
        
        this.renderer.domElement.addEventListener('wheel', (event) => {
            event.preventDefault();
            this.cameraRadius += event.deltaY * 0.01;
            this.cameraRadius = Math.max(8, Math.min(25, this.cameraRadius));
            this.updateCameraPosition();
        });
        
        this.renderer.domElement.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
    }
    
    updateCameraPosition() {
        const x = this.cameraCenter.x + this.cameraRadius * Math.sin(this.cameraAngle.phi) * Math.cos(this.cameraAngle.theta);
        const y = this.cameraRadius * Math.cos(this.cameraAngle.phi);
        const z = this.cameraCenter.z + this.cameraRadius * Math.sin(this.cameraAngle.phi) * Math.sin(this.cameraAngle.theta);
        
        this.camera.position.set(x, y, z);
        this.camera.lookAt(this.cameraCenter);
    }
    
    attackUnit(attacker, target) {
        const distance = Math.abs(attacker.userData.gridX - target.userData.gridX) + 
                        Math.abs(attacker.userData.gridZ - target.userData.gridZ);
        
        if (distance > 6) {
            console.log('Target too far away!');
            return;
        }
        
        const baseHitChance = 75;
        const distancePenalty = distance * 5;
        const coverBonus = this.grid[target.userData.gridX][target.userData.gridZ].cover ? 20 : 0;
        const hitChance = Math.max(10, baseHitChance - distancePenalty - coverBonus);
        
        const roll = Math.random() * 100;
        const hit = roll < hitChance;
        
        console.log(`Attack: ${hitChance}% hit chance, rolled ${roll.toFixed(1)}% - ${hit ? 'HIT!' : 'MISS!'}`);
        
        if (hit) {
            const damage = 25 + Math.floor(Math.random() * 15);
            target.userData.health -= damage;
            console.log(`Dealt ${damage} damage! Enemy health: ${target.userData.health}`);
            
            if (target.userData.health <= 0) {
                this.removeUnit(target);
            } else {
                this.flashUnit(target, 0xff0000);
            }
        }
        
        attacker.userData.actionPoints -= 1;
        this.highlightUnit(attacker);
        this.updateUI();
    }
    
    removeUnit(unit) {
        this.grid[unit.userData.gridX][unit.userData.gridZ].occupied = false;
        this.scene.remove(unit);
        
        if (unit.userData.type === 'enemy') {
            const index = this.enemies.indexOf(unit);
            if (index > -1) this.enemies.splice(index, 1);
        } else if (unit.userData.type === 'soldier') {
            const index = this.soldiers.indexOf(unit);
            if (index > -1) this.soldiers.splice(index, 1);
        }
        
        this.checkGameEnd();
    }
    
    flashUnit(unit, color) {
        const originalColor = unit.material.color.getHex();
        unit.material.color.setHex(color);
        
        setTimeout(() => {
            unit.material.color.setHex(originalColor);
        }, 200);
    }
    
    checkGameEnd() {
        if (this.enemies.length === 0) {
            alert('Victory! All enemies defeated!');
        } else if (this.soldiers.length === 0) {
            alert('Defeat! All soldiers lost!');
        }
    }
    
    enemyAI() {
        this.enemies.forEach(enemy => {
            if (enemy.userData.actionPoints <= 0) return;
            
            const nearestSoldier = this.findNearestUnit(enemy, this.soldiers);
            if (!nearestSoldier) return;
            
            const distance = Math.abs(enemy.userData.gridX - nearestSoldier.userData.gridX) + 
                           Math.abs(enemy.userData.gridZ - nearestSoldier.userData.gridZ);
            
            if (distance <= 6 && enemy.userData.actionPoints > 0) {
                const baseHitChance = 60;
                const distancePenalty = distance * 5;
                const coverBonus = this.grid[nearestSoldier.userData.gridX][nearestSoldier.userData.gridZ].cover ? 20 : 0;
                const hitChance = Math.max(10, baseHitChance - distancePenalty - coverBonus);
                
                const roll = Math.random() * 100;
                const hit = roll < hitChance;
                
                console.log(`Enemy Attack: ${hitChance}% hit chance, rolled ${roll.toFixed(1)}% - ${hit ? 'HIT!' : 'MISS!'}`);
                
                if (hit) {
                    const damage = 20 + Math.floor(Math.random() * 10);
                    nearestSoldier.userData.health -= damage;
                    console.log(`Enemy dealt ${damage} damage! Soldier health: ${nearestSoldier.userData.health}`);
                    
                    if (nearestSoldier.userData.health <= 0) {
                        this.removeUnit(nearestSoldier);
                    } else {
                        this.flashUnit(nearestSoldier, 0xff0000);
                    }
                }
                
                enemy.userData.actionPoints -= 1;
            } else if (distance > 2 && enemy.userData.actionPoints >= 1) {
                this.moveEnemyTowards(enemy, nearestSoldier);
            }
        });
    }
    
    findNearestUnit(fromUnit, unitList) {
        let nearest = null;
        let minDistance = Infinity;
        
        unitList.forEach(unit => {
            const distance = Math.abs(fromUnit.userData.gridX - unit.userData.gridX) + 
                           Math.abs(fromUnit.userData.gridZ - unit.userData.gridZ);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = unit;
            }
        });
        
        return nearest;
    }
    
    moveEnemyTowards(enemy, target) {
        const dx = target.userData.gridX - enemy.userData.gridX;
        const dz = target.userData.gridZ - enemy.userData.gridZ;
        
        let newX = enemy.userData.gridX;
        let newZ = enemy.userData.gridZ;
        
        if (Math.abs(dx) > Math.abs(dz)) {
            newX += dx > 0 ? 1 : -1;
        } else {
            newZ += dz > 0 ? 1 : -1;
        }
        
        if (newX >= 0 && newX < this.gridSize && newZ >= 0 && newZ < this.gridSize && 
            !this.grid[newX][newZ].occupied) {
            this.moveUnit(enemy, newX, newZ);
        }
    }
    
    setupUI() {
        const ui = document.createElement('div');
        ui.id = 'gameUI';
        ui.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 14px;
            background: rgba(0,0,0,0.7);
            padding: 10px;
            border-radius: 5px;
        `;
        document.body.appendChild(ui);
        
        const endTurnBtn = document.createElement('button');
        endTurnBtn.textContent = 'End Turn';
        endTurnBtn.style.cssText = `
            margin-top: 10px;
            padding: 5px 10px;
            background: #0066cc;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        `;
        endTurnBtn.onclick = () => this.endTurn();
        ui.appendChild(endTurnBtn);
        
        this.updateUI();
    }
    
    updateUI() {
        const ui = document.getElementById('gameUI');
        if (!ui) return;
        
        const unitInfo = this.selectedUnit ? 
            `Selected: ${this.selectedUnit.userData.type}<br>
             Health: ${this.selectedUnit.userData.health}<br>
             Action Points: ${this.selectedUnit.userData.actionPoints}/${this.selectedUnit.userData.maxActionPoints}` :
            'No unit selected';
            
        ui.innerHTML = `
            <strong>Turn: ${this.currentTurn}</strong><br>
            ${unitInfo}<br>
            <button onclick="game.endTurn()" style="margin-top: 10px; padding: 5px 10px; background: #0066cc; color: white; border: none; border-radius: 3px; cursor: pointer;">End Turn</button>
        `;
    }
    
    endTurn() {
        if (this.currentTurn === 'player') {
            this.soldiers.forEach(soldier => {
                soldier.userData.actionPoints = soldier.userData.maxActionPoints;
            });
            this.currentTurn = 'enemy';
            this.selectedUnit = null;
            this.clearHighlights();
            
            setTimeout(() => {
                this.enemyAI();
                setTimeout(() => {
                    this.enemies.forEach(enemy => {
                        enemy.userData.actionPoints = enemy.userData.maxActionPoints;
                    });
                    this.currentTurn = 'player';
                    this.selectedUnit = this.soldiers.length > 0 ? this.soldiers[0] : null;
                    if (this.selectedUnit) this.highlightUnit(this.selectedUnit);
                    this.updateUI();
                }, 1000);
            }, 500);
        }
        this.updateUI();
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('resize', () => {
    if (window.game) {
        window.game.camera.aspect = window.innerWidth / window.innerHeight;
        window.game.camera.updateProjectionMatrix();
        window.game.renderer.setSize(window.innerWidth, window.innerHeight);
    }
});

window.game = new XCOMGame();