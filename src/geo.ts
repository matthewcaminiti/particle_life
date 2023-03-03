const degToRad = (deg: number): number => {
	return deg * Math.PI / 180
}

export class rect {
	x: number
	y: number
	w: number
	h: number
	speed: number
	directionDeg: number
	positions: Array<number>

	constructor(x: number, y: number, w: number, h: number, speed: number) {
		this.x = x
		this.y = y
		this.w = w
		this.h = h
		this.directionDeg = 45
		this.speed = speed
		this.positions = [
			x, y,
			x + w, y,
			x + w, y + h,

			x, y,
			x, y + h,
			x + w, y + h,
		]
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
