import {degToRad} from "./util"

export const v2 = {
	magnitude(v: vec2): number {
		return Math.sqrt(v.x ** 2 + v.y ** 2)
	},
	normalize(v: vec2): vec2 {
		const mag = v2.magnitude(v)
		return mag !== 0 ? {x: v.x / mag, y: v.y / mag} : {x: 0, y: 0}
	},
	add(v1: vec2, v2: vec2): vec2 {
		return {x: v1.x + v2.x, y: v1.y + v2.y}
	},
	sub(v1: vec2, v2: vec2): vec2 {
		return {x: v1.x - v2.x, y: v1.y - v2.y}
	},
	scale(v: vec2, factor: number): vec2 {
		return {x: v.x * factor, y: v.y * factor}
	},
	dist(v1: vec2, v2: vec2): number {
		return Math.sqrt((v1.y - v2.y) ** 2 + (v1.x - v2.x) ** 2)
	}

}

interface vec2 {x: number, y: number}
export class vec4 {
	x: number
	y: number
	z: number
	w: number
	string: string

	constructor(x: number, y: number, z: number, w: number) {
		this.x = x
		this.y = y
		this.z = z
		this.w = w
		this.string = `${this.x},${this.y},${this.z},${this.w}`

	}
}

export const colors = {
	black: new vec4(0, 0, 0, 1),
	blue: new vec4(0, 0, 1, 1),
	green: new vec4(0, 1, 0, 1),
	cyan: new vec4(0, 1, 1, 1),
	red: new vec4(1, 0, 0, 1),
	purple: new vec4(1, 0, 1, 1),
	yellow: new vec4(1, 1, 0, 1),
	white: new vec4(1, 1, 1, 1),
}

export class rect {
	x: number
	y: number
	w: number
	h: number
	speed: number
	directionDeg: number
	positions: Array<number>
	nIndices: number

	constructor(x: number, y: number, w: number, h: number, speed: number, directionDeg: number) {
		this.x = x
		this.y = y
		this.w = w
		this.h = h
		this.directionDeg = directionDeg
		this.speed = speed
		this.positions = [
			x, y,
			x + w, y,
			x + w, y + h,

			x, y,
			x, y + h,
			x + w, y + h,
		]
		this.nIndices = this.positions.length
	}

	update(dt: number, w: number, h: number) {
		const newPos = (i: number): number => {
			if (i % 2 == 0) {
				const dx = this.speed * dt * Math.cos(degToRad(this.directionDeg))
				return this.positions[i] + dx
			}

			const dy = this.speed * dt * Math.sin(degToRad(this.directionDeg))
			return this.positions[i] + dy
		}

		if (
			newPos(1) <= 0 || // top wall
			newPos(5) >= h // bottom wall
		) {
			this.directionDeg = 360 - this.directionDeg
		} else if (
			newPos(0) <= 0 || // left wall
			newPos(2) >= w // right wall
		) {
			this.directionDeg = 180 - this.directionDeg
		}

		this.positions = this.positions.map((_, i) => newPos(i))
	}
}

export class circle {
	pos: vec2
	r: number
	steps: number
	color: vec4
	velocity: vec2
	indices: Array<number>
	rAoe: number

	constructor(pos: vec2, r: number, steps: number, color: vec4, velocity: vec2, rAoe: number) {
		this.pos = pos
		this.r = r
		this.steps = steps
		this.color = color
		this.velocity = velocity
		this.rAoe = rAoe

		this.indices = this.getIndices()
	}

	get x() { return this.pos.x }
	get y() { return this.pos.y }

	get speed() {
		return v2.magnitude(this.velocity)
	}

	getIndices(): Array<number> {
		let indices = []

		let prevPoint = {x : this.x + this.r, y: this.y}
		for (let i = 1; i <= this.steps; i++) {
			// push origin, prev point, next point
			let newX = this.r * Math.cos(degToRad((360/this.steps) * i)) + this.x
			let newY = this.r * Math.sin(degToRad((360/this.steps) * i)) + this.y
			indices.push(this.x, this.y, prevPoint.x, prevPoint.y, newX, newY)

			prevPoint.x = newX
			prevPoint.y = newY
		}

		return indices
	}

	update(dt: number, w: number, h: number) {
		let dx = this.velocity.x * dt
		let dy = this.velocity.y * dt

		if (
			this.x + dx + this.r >= w || // right wall
			this.x + dx - this.r <= 0 // left wall
		) {
			this.velocity.x *= -1
		}

		if (
			this.y + dy + this.r >= h || // bottom wall
			this.y + dy - this.r <= 0 // top wall
		) {
			this.velocity.y *= -1
		}

		dx = this.velocity.x * dt
		dy = this.velocity.y * dt

		this.pos.x += dx
		this.pos.y += dy

		this.indices = this.getIndices()
		this.velocity = v2.scale(this.velocity, 0.95)
	}

	isAffectedBy(other: circle) {
		return v2.dist(other.pos, this.pos) <= (this.rAoe + other.r)
	}

	doesAffect(dt: number, other: circle) {
		const nextOtherX = other.x + other.velocity.x * dt
		const nextOtherY = other.y + other.velocity.y * dt

		const nextThisX = this.x + this.velocity.x * dt
		const nextThisY = this.y + this.velocity.y * dt

		const dist = Math.sqrt((nextOtherY - nextThisY) ** 2 + (nextOtherX - nextThisX) ** 2)
		return dist <= (this.rAoe + other.r)
	}

	reactionTo(other: circle, factor: number): vec2 {
		let d = v2.sub(other.pos, this.pos)
		let nd = v2.normalize(d)
		/* const proportion = 1 - (v2.magnitude(d) / this.rAoe) // if on edge of aoe, want minimum effect */
		const proportion = -1 * (v2.magnitude(d) / this.rAoe) ** 2 + 1

		if (factor < 0) {
			// repulsed
			nd = v2.scale(nd, -1)
			factor *= -1
		}

		return {x: nd.x * proportion * factor, y: nd.y * proportion * factor}
	}

	reactTo(other: circle, factor: number) {
		// set other's velocity to magnitude proportional to closeness and factor
		// don't increment velocity, only set
		let d = v2.sub(other.pos, this.pos)
		let normD = v2.normalize(d)
		const proportion = 1 - (v2.magnitude(d) / this.rAoe) // if on edge of aoe, want minimum effect

		if (factor < 0) {
			// repulsed
			normD = v2.scale(normD, -1)
			factor *= -1
		}

		this.velocity = {x: normD.x * proportion * factor, y: normD.y * proportion * factor}

		/* const overlap = Math.abs(v2.magnitude(d) - this.rAoe - other.r) */
		/* this.pos = v2.add(this.pos, v2.scale(normD, 0.5 * overlap)) */
	}

	isColliding(other: circle): boolean {
		return v2.dist(other.pos, this.pos) <= (other.r + this.r)
	}

	doesCollide(dt: number, other: circle): boolean {
		// check if other and this collide after moving
		const nextOtherX = other.x + other.velocity.x * dt
		const nextOtherY = other.y + other.velocity.y * dt

		const nextThisX = this.x + this.velocity.x * dt
		const nextThisY = this.y + this.velocity.y * dt

		return Math.sqrt((nextOtherY - nextThisY) ** 2 + (nextOtherX - nextThisX) ** 2) <= (other.r + this.r)
	}

	collide(other: circle) {
		const d = v2.sub(other.pos, this.pos)

		const normD = v2.normalize(d)
		const thisSpeed = this.speed
		const damping = 0.9

		this.velocity = { x: damping * other.speed * normD.x * -1, y: damping * other.speed * normD.y * -1 }
		other.velocity = { x: damping * thisSpeed * normD.x, y: damping * thisSpeed * normD.y }

		const overlap = Math.abs(v2.magnitude(d) - this.r - other.r)
		this.pos = v2.add(this.pos, v2.scale(normD, -0.5 * overlap))
		other.pos = v2.add(other.pos, v2.scale(normD, 0.5 * overlap))
	}
}

export class Verlet {
	posCurr: vec2
	posOld: vec2
	r: number
	color: vec4
	a: vec2
	roe: number

	constructor(posCurr: vec2, posOld: vec2, r: number, roe: number, color: vec4, a: vec2) {
		this.posCurr = posCurr
		this.posOld = posOld
		this.r = r
		this.roe = roe
		this.color = color
		this.a = a
	}

	updatePosition(dt: number) {
		const v = v2.sub(this.posCurr, this.posOld)
		this.posOld = this.posCurr
		this.posCurr = v2.add(v2.add(this.posCurr, v), v2.scale(this.a, dt * dt))
		this.a = {x: 0, y: 0}
	}

	accelerate(a: vec2) {
		if (v2.magnitude(this.a) >= 5) return
		this.a = v2.add(this.a, a)
	}
}
