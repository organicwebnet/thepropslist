import { generateId } from "../lib/utils.ts";
import { PackedProp } from "../types/index.ts";
import { PackingBox } from '../types/index.ts';
import type { Prop } from '../shared/types/props.ts';
import { Platform } from 'react-native';
import { FirebaseService } from '../shared/services/firebase/types.ts';

export class PackingService {
  private static instance: PackingService;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  static getInstance(): PackingService {
    if (!PackingService.instance) {
      PackingService.instance = new PackingService();
    }
    return PackingService.instance;
  }

  createBox(
    showId: string,
    props: Prop[],
    actNumber: number,
    sceneNumber: number
  ): PackingBox {
    const packedProps = this.createPackedProps(props);
    const totalWeight = this.calculateTotalWeight(packedProps);

    return {
      id: generateId(),
      name: `Box ${actNumber}.${sceneNumber}`,
      showId,
      actNumber,
      sceneNumber,
      props: packedProps,
      totalWeight,
      weightUnit: 'kg',
      isHeavy: this.isHeavyBox(totalWeight),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private createPackedProps(props: Prop[]): PackedProp[] {
    return props.map(prop => ({
      propId: prop.id,
      name: prop.name,
      quantity: 1,
      weight: prop.weight || 0,
      weightUnit: prop.weightUnit || 'kg',
      isFragile: this.checkIfFragile(prop)
    }));
  }

  private calculateTotalWeight(props: PackedProp[]): number {
    return props.reduce((total, prop) => {
      const weight = prop.weightUnit === 'kg' 
        ? prop.weight 
        : prop.weight * 0.453592; // Convert lb to kg
      return total + (weight * prop.quantity);
    }, 0);
  }

  private isHeavyBox(weightKg: number): boolean {
    return weightKg > 23; // Standard lifting limit
  }

  private checkIfFragile(prop: Prop): boolean {
    const fragileKeywords = ['fragile', 'delicate', 'breakable', 'glass'];
    return fragileKeywords.some(keyword => 
      prop.handlingInstructions?.toLowerCase().includes(keyword) ||
      prop.description?.toLowerCase().includes(keyword)
    );
  }
} 