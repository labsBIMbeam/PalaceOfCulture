// Local type shim for ecctrl 1.0.88.
//
// ecctrl's published .d.ts re-exports its mobile-joystick from `../src/EcctrlJoystick.tsx`, which
// tsc then compiles under our strict config and reports errors *inside the library* (null checks we
// can't fix in node_modules). We only use the default <Ecctrl> third-person controller, so we
// declare just that here and point tsconfig `paths` at this file. The bundler still resolves the
// real package at runtime — this only swaps the types tsc reads.
declare module "ecctrl" {
  import type { ForwardRefExoticComponent, ReactNode, RefAttributes } from "react";
  import type { RapierRigidBody, RigidBodyProps } from "@react-three/rapier";

  export interface EcctrlProps extends RigidBodyProps {
    children?: ReactNode;
    debug?: boolean;
    capsuleHalfHeight?: number;
    capsuleRadius?: number;
    characterInitDir?: number;
    floatHeight?: number;
    camInitDis?: number;
    camMaxDis?: number;
    camMinDis?: number;
    camCollision?: boolean;
    maxVelLimit?: number;
    turnSpeed?: number;
    /** Velocity kept while the model is still turning toward the move direction (default 0.2). */
    turnVelMultiplier?: number;
    /** Acceleration integration window — smaller reaches max speed faster (default 8). */
    accDeltaTime?: number;
    /** Ground drag when no key is held — higher stops faster (default 0.15). */
    dragDampingC?: number;
    sprintMult?: number;
    jumpVel?: number;
    /** Height (above the body centre) where the move impulse is applied — >0 pitches the body. */
    moveImpulsePointY?: number;
    /** Upright auto-balance spring stiffness. */
    autoBalanceSpringK?: number;
    /** Upright auto-balance damping. */
    autoBalanceDampingC?: number;
    /** How far past the float distance the ground ray still counts as "grounded" (canJump). */
    rayHitForgiveness?: number;
    rayLength?: number;
    jumpForceToGroundMult?: number;
    /** When true, the controller drives `useGame().curAnimation` from the movement state. */
    animated?: boolean;
  }

  const Ecctrl: ForwardRefExoticComponent<EcctrlProps & RefAttributes<RapierRigidBody>>;
  export default Ecctrl;

  // The built-in animation/game store. Names map canonical locomotion states → clip names; the
  // controller sets `curAnimation` to the matching value as the player moves.
  export type AnimationSet = {
    idle?: string;
    walk?: string;
    run?: string;
    jump?: string;
    jumpIdle?: string;
    jumpLand?: string;
    fall?: string;
    action1?: string;
    action2?: string;
    action3?: string;
    action4?: string;
  };

  export interface GameState {
    curAnimation: string | null;
    animationSet: AnimationSet;
    initializeAnimationSet: (animationSet: AnimationSet) => void;
    reset: () => void;
  }

  export interface UseGame {
    <T>(selector: (state: GameState) => T): T;
    getState(): GameState;
    setState(partial: Partial<GameState>): void;
  }

  export const useGame: UseGame;
}
