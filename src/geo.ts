const degToRad = (deg: number): number => {
	return deg * Math.PI / 180
}

const v2 = {
	magnitude(v: vec2): number {
		return Math.sqrt(v.x ** 2 + v.y ** 2)
	},
	normalize(v: vec2): vec2 {
		const mag = v2.magnitude(v)
		return mag ? {x: v.x / mag, y: v.y / mag} : {x: 0, y: 0}
	},
	add(v1: vec2, v2: vec2): vec2 {
		return {x: v1.x + v2.x, y: v2.x + v2.y}
	}
}

interface vec2 {x: number, y: number}

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

	update(deltaTime: number, w: number, h: number) {
		const newPos = (i: number): number => {
			if (i % 2 == 0) {
				const dx = this.speed * deltaTime * Math.cos(degToRad(this.directionDeg))
				return this.positions[i] + dx
			}

			const dy = this.speed * deltaTime * Math.sin(degToRad(this.directionDeg))
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
	x: number
	y: number
	r: number
	steps: number
	color: [number, number, number, number]
	velocity: vec2
	indices: Array<number>

	constructor(x: number, y: number, r: number, steps: number, color: [number, number, number, number], velocity: vec2) {
		this.x = x
		this.y = y
		this.r = r
		this.steps = steps
		this.color = color
		this.velocity = velocity

		this.indices = this.getIndices()
	}

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

	update(deltaTime: number, w: number, h: number) {
		let dx = this.velocity.x * deltaTime
		let dy = this.velocity.y * deltaTime

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

		dx = this.velocity.x * deltaTime
		dy = this.velocity.y * deltaTime

		this.x += dx
		this.y += dy

		this.indices = this.getIndices()
	}

	doesCollide(deltaTime: number, other: circle): boolean {
		// check if other and this collide after moving
		const nextOtherX = other.x + other.velocity.x * deltaTime
		const nextOtherY = other.y + other.velocity.y * deltaTime

		const nextThisX = this.x + this.velocity.x * deltaTime
		const nextThisY = this.y + this.velocity.y * deltaTime

		return Math.sqrt((nextOtherY - nextThisY) ** 2 + (nextOtherX - nextThisX) ** 2) <= (other.r + this.r)
	}

	collide(other: circle) {
		const dx = other.x - this.x
		const dy = other.y - this.y
		const normCollision = v2.normalize({x: dx, y: dy})

		const thisSpeed = this.speed

		const damping = 0.9
		this.velocity = { x: damping * other.speed * normCollision.x * -1, y: damping * other.speed * normCollision.y * -1 }
		other.velocity = { x: damping * thisSpeed * normCollision.x, y: damping * thisSpeed * normCollision.y }
	}
}
