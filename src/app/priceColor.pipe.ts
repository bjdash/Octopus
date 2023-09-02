import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'priceColor' })
export class PriceColorPipe implements PipeTransform {

  transform(value: any): string {
    if (value < 20) {
      return 'green'
    } else if (value < 27) {
      return 'orange'
    } else {
      return 'red'
    }
  }
}