export type MouseState = {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  dx: number;
  dy: number;
  isPressed: boolean;
  justPressed: boolean;
  justReleased: boolean;
  button: number;
  inside: boolean;
};

export const mouse: MouseState = {
  x: 0,
  y: 0,
  prevX: 0,
  prevY: 0,
  dx: 0,
  dy: 0,
  isPressed: false,
  justPressed: false,
  justReleased: false,
  button: -1,
  inside: false,
};

function updatePosition(canvas: HTMLCanvasElement, event: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const nextX = event.clientX - rect.left;
  const nextY = event.clientY - rect.top;

  mouse.prevX = mouse.x;
  mouse.prevY = mouse.y;
  mouse.x = nextX;
  mouse.y = nextY;
  mouse.dx = mouse.x - mouse.prevX;
  mouse.dy = mouse.y - mouse.prevY;
}

export function consumeMouseTransitions(): void {
  mouse.justPressed = false;
  mouse.justReleased = false;
}

export function isMouseInArea(
  position: { x: number; y: number },
  width: number,
  height: number,
): boolean {
  const minX = Math.min(position.x, position.x + width);
  const maxX = Math.max(position.x, position.x + width);
  const minY = Math.min(position.y, position.y + height);
  const maxY = Math.max(position.y, position.y + height);

  return mouse.inside && mouse.x >= minX && mouse.x <= maxX &&
    mouse.y >= minY && mouse.y <= maxY;
}

export function initMouse(canvas: HTMLCanvasElement): () => void {
  const onMouseMove = (event: MouseEvent): void => {
    updatePosition(canvas, event);
  };

  const onMouseDown = (event: MouseEvent): void => {
    updatePosition(canvas, event);
    mouse.isPressed = true;
    mouse.justPressed = true;
    mouse.button = event.button;
    mouse.inside = true;
  };

  const onMouseUp = (event: MouseEvent): void => {
    updatePosition(canvas, event);
    mouse.isPressed = false;
    mouse.justReleased = true;
    mouse.button = -1;
  };

  const onMouseEnter = (event: MouseEvent): void => {
    updatePosition(canvas, event);
    mouse.inside = true;
  };

  const onMouseLeave = (): void => {
    mouse.inside = false;
    mouse.dx = 0;
    mouse.dy = 0;
  };

  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("mouseup", onMouseUp);
  canvas.addEventListener("mouseenter", onMouseEnter);
  canvas.addEventListener("mouseleave", onMouseLeave);
  window.addEventListener("mouseup", onMouseUp);

  return () => {
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("mousedown", onMouseDown);
    canvas.removeEventListener("mouseup", onMouseUp);
    canvas.removeEventListener("mouseenter", onMouseEnter);
    canvas.removeEventListener("mouseleave", onMouseLeave);
    window.removeEventListener("mouseup", onMouseUp);
  };
}
