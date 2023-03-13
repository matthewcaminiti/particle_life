import {createShader, createProgram} from "./canvas"
import {randInt, degToRad} from "./util"
import {colors, Verlet, v2, COLOR_NAMES} from "./geo"

export class Solver {
	w: number
	h: number
	verlets: Array<Verlet>
	colorIndices: Record<string, number>
	behaviourMatrix: Array<Array<number>>
	spaceParition: {cellWidth: number, cellHeight: number, nH: number, nV: number}
	cells: Array<Array<number>>

	constructor(
		canvasW: number,
		canvasH: number,
		nVerlets: number,
		chosenColors: Array<string>,
		behaviourMatrix: Array<Array<number>>,
		colorIndices: Record<string, number>
	) {
		this.w = canvasW
		this.h = canvasH

		this.verlets = [...Array(nVerlets)].map(() => {
			const r = randInt(2, 2)
			const pos = {x: randInt(r*2, canvasW - r*2), y: randInt(r*2, canvasH - r*2)}
			return new Verlet(
				pos,
				pos,
				r,
				75,
				colors[COLOR_NAMES[chosenColors[randInt(0, chosenColors.length - 1)]]],
				{x: 0, y: 0}
			)
		})

		this.colorIndices = {...colorIndices}

		this.behaviourMatrix = behaviourMatrix.map((arr) => {
			return arr.map((val) => val * .00001)
		})

		const maxRoe = this.verlets.reduce((acc, curr) => curr.roe > acc ? curr.roe : acc, 0)
		const cellWidth = Math.max(maxRoe, canvasW/100) // 100, 50 arbitrary choices for perf
		const cellHeight = Math.max(maxRoe, canvasH/50)
		this.spaceParition = {
			cellWidth: cellWidth,
			cellHeight: cellHeight,
			nH: Math.ceil(canvasW/cellWidth),
			nV: Math.ceil(canvasH/cellHeight),
		}
		console.log(`~~~Cells~~~\npartitions: (${this.spaceParition.nH}, ${this.spaceParition.nV})\nsize: (${cellWidth}, ${cellHeight})`)
		this.cells = this.getSpaceParitions()
	}

	update(dt: number) {
		let subSteps = 1
		const subDt = dt/subSteps

		for (;subSteps > 0; subSteps--) {
			this.applyWindowConstraint()
			this.solveCollisions()
			this.updatePositions(subDt)
		}

	}

	getSpaceParitions(): Array<Array<number>> {
		const cells: Array<Array<number>> = [
			...Array(this.spaceParition.nH * this.spaceParition.nV)
		].map(_ => [])

		for (let i = 0; i < this.verlets.length; i++) {
			const verlet = this.verlets[i]

			let col = Math.floor(verlet.posCurr.x / this.spaceParition.cellWidth)
			let row = Math.floor(verlet.posCurr.y / this.spaceParition.cellHeight)
			cells[row * this.spaceParition.nH + col].push(i)
		}

		return cells
	}

	updatePositions(dt: number) {
		for (let i = 0; i < this.verlets.length; i++) {
			this.verlets[i].updatePosition(dt)
		}
	}

	applyWindowConstraint() {
		for (let i = 0; i < this.verlets.length; i++) {
			const verlet = this.verlets[i]
			// right wall
			if (verlet.posCurr.x + verlet.r > this.w) {
				verlet.posCurr.x = this.w - verlet.r
			}
			// left wall
			if (verlet.posCurr.x - verlet.r < 0) {
				verlet.posCurr.x = verlet.r
			}
			// bottom wall
			if (verlet.posCurr.y + verlet.r > this.h) {
				verlet.posCurr.y = this.h - verlet.r
			}
			// top wall
			if (verlet.posCurr.y - verlet.r < 0) {
				verlet.posCurr.y = verlet.r
			}
		}
	}

	solveCollisions() {
		this.cells = this.getSpaceParitions()

		for (let i = 1; i < this.spaceParition.nH - 1; i++) {
			for (let j = 1; j < this.spaceParition.nV - 1; j++) {
				const cellIdx = j * this.spaceParition.nH + i
				const verletIndices = [
					...this.cells[cellIdx-1 - this.spaceParition.nH], ...this.cells[cellIdx - this.spaceParition.nH], ...this.cells[cellIdx+1 - this.spaceParition.nH],
					...this.cells[cellIdx-1], ...this.cells[cellIdx], ...this.cells[cellIdx+1],
					...this.cells[cellIdx-1 + this.spaceParition.nH], ...this.cells[cellIdx + this.spaceParition.nH], ...this.cells[cellIdx+1 + this.spaceParition.nH],
				]

				if (verletIndices.length <= 1) continue

				for (let k = 0; k < verletIndices.length; k++) {
					const verlet = this.verlets[verletIndices[k]]

					for (let l = 0; l < verletIndices.length; l++) {
						if (k === l) continue

						const _verlet = this.verlets[verletIndices[l]]

						// -- Collision
						const collisionAxis = v2.sub(verlet.posCurr, _verlet.posCurr)
						const n = v2.normalize(collisionAxis)
						const mag = v2.magnitude(collisionAxis)

						if (mag < (verlet.r + _verlet.r)) {
							const delta = verlet.r + _verlet.r - mag
							const incident = v2.scale(n, 0.5 * delta)

							verlet.posCurr = v2.add(verlet.posCurr, incident)
							_verlet.posCurr = v2.sub(_verlet.posCurr, incident)
						}

						// -- Effect
						const v1Tov2Factor = this.behaviourMatrix[
							this.colorIndices[verlet.color.string]
							][
							this.colorIndices[_verlet.color.string]]
						const v2Tov1Factor = this.behaviourMatrix[
							this.colorIndices[_verlet.color.string]
							][
							this.colorIndices[verlet.color.string]]
						
						if (!isNaN(v1Tov2Factor) && v1Tov2Factor !== 0) {
							// v1 is either repulsed or attracted to v2
							if (mag < (verlet.roe + _verlet.r)) {
								// set accel
								const delta = verlet.roe + _verlet.r - mag
								const incident = v2.scale(n, -1 * delta * v1Tov2Factor)

								verlet.posCurr = v2.add(verlet.posCurr, incident)
								/* verlet.accelerate(incident) */
							}
						}

						if (!isNaN(v2Tov1Factor) && v2Tov1Factor !== 0) {
							// v2 is either repulse or attracted to v1
							if (mag < (verlet.r + _verlet.roe)) {
								// set accel
								const delta = verlet.r + _verlet.roe - mag
								const incident = v2.scale(n, 1 * delta * v2Tov1Factor)

								_verlet.posCurr = v2.add(_verlet.posCurr, incident)
								/* _verlet.accelerate(incident) */
							}
						}
					}
				}
			}
		}
	}
}

export class Renderer {
	gl: WebGLRenderingContext
	program: WebGLProgram
	attributes: Record<string, number>
	buffers: Record<string, WebGLBuffer>
	uniforms: Record<string, WebGLUniformLocation>

	constructor(gl: WebGLRenderingContext) {
		this.gl = gl
		this.attributes = {}
		this.buffers = {}
		this.uniforms = {}

		const vertexShaderSrc = `
	// an attribute will receive data from a buffer
	attribute vec2 a_position;

	uniform vec2 u_resolution;

	varying vec2 v_pos;

	// all shaders have a main function
	void main() {
		// convert the position from pixels to 0.0 to 1.0
		vec2 zeroToOne = a_position / u_resolution;

		// convert from 0->1 to 0->2
		vec2 zeroToTwo = zeroToOne * 2.0;

		// convert from 0->2 to -1->+1 (clip space)
		vec2 clipSpace = zeroToTwo - 1.0;

		vec2 yFlipped = vec2(clipSpace.x, clipSpace.y * -1.0);
		
		// gl_Position is a special variable a vertex shader
		// is responsible for setting
		gl_Position = vec4(yFlipped, 0, 1);

		v_pos = gl_Position.xy;
	}
		`

		const fragmentShaderSrc = `
	// fragment shaders don't have a default precision so we need to pick one.
	// mediump is a good default. it means "medium precision"
	precision mediump float;

	// varying vec2 v_pos;
	uniform vec4 u_color;

	void main() {
		// gl_FragColor is a special variable a fragment shader is responsible for setting
		// gl_FragColor = vec4(v_pos, 0.5, 1);
		gl_FragColor = u_color;
	}
		`
		
		const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc)
		const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc)

		this.program = createProgram(gl, vertexShader, fragmentShader)

		this.attributes["a_position"] = gl.getAttribLocation(this.program, "a_position")
		const positionBuffer = gl.createBuffer()
		if (!positionBuffer) {
			throw new Error("Failed to create position buffer")
		}
		this.buffers["position"] = positionBuffer

		const colorUniformLocation = gl.getUniformLocation(this.program, "u_color")
		if (!colorUniformLocation) {
			throw new Error("Failed to get 'u_color' location")
		}
		this.uniforms["u_color"] = colorUniformLocation

		gl.useProgram(this.program)

		console.log(`~~~Resolution~~~\n(${gl.canvas.width} x ${gl.canvas.height}) px`)
	}

	get w() {
		return this.gl.canvas.width
	}
	get h() {
		return this.gl.canvas.height
	}

	drawVerlet(verlet: Verlet) {
		const _r = Math.floor(verlet.r * 0.8)
		const steps = _r <= 10 ? 10 : _r
		let indices: Array<number> = Array(steps*6).map(() => 0)

		let prevPoint = {x : verlet.posCurr.x + verlet.r, y: verlet.posCurr.y}
		for (let i = 1; i <= steps; i++) {
			// push origin, prev point, next point
			let newX = verlet.r * Math.cos(degToRad((360/steps) * i)) + verlet.posCurr.x
			let newY = verlet.r * Math.sin(degToRad((360/steps) * i)) + verlet.posCurr.y

			let adjIdx = (i - 1) * 6
			indices[adjIdx] = verlet.posCurr.x
			indices[adjIdx + 1] = verlet.posCurr.y
			indices[adjIdx + 2] = prevPoint.x
			indices[adjIdx + 3] = prevPoint.y
			indices[adjIdx + 4] = newX
			indices[adjIdx + 5] = newY

			prevPoint.x = newX
			prevPoint.y = newY
		}

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers["position"])
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(indices), this.gl.DYNAMIC_DRAW)

		this.gl.vertexAttribPointer(
			this.attributes["a_position"], // location
			2, // size (num values to pull from buffer per iteration)
			this.gl.FLOAT, // type of data in buffer
			false, // normalize
			0, // stride (0 = compute from size and type above)
			0 // offset in buffer
		)
		this.gl.enableVertexAttribArray(this.attributes["a_position"])

		this.gl.uniform4f(this.uniforms["u_color"], verlet.color.x, verlet.color.y, verlet.color.z, verlet.color.w)

		this.gl.drawArrays(
			this.gl.TRIANGLES,
			0, // ofset
			indices.length // num vertices per instance
		)
	}
}
