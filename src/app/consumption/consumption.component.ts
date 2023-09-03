import { Component } from '@angular/core';
import { AccountDetails, Consumption } from '../models';

@Component({
  selector: 'app-consumption',
  templateUrl: './consumption.component.html',
  styleUrls: ['./consumption.component.scss']
})
export class ConsumptionComponent {
  accountDetails: AccountDetails = {
    mpan: '',
    electricitySerialNo: '',
    mprn: '',
    gasSerialNo: '',
    apiKey: ''
  }

  todaysConsumption_e: Consumption[] = []

  constructor() {
    Object.keys(this.accountDetails).forEach(key => {
      this.accountDetails[key as keyof AccountDetails] = localStorage.getItem(key) as string;
    });

    this.getElectricConsumptionToday();
  }

  async getElectricConsumptionToday() {
    let midnight = new Date();
    midnight.setHours(0, 0, 0, 0)

    const res = await fetch(
      `https://api.octopus.energy/v1/electricity-meter-points/${this.accountDetails.mpan}/meters/${this.accountDetails.electricitySerialNo}/consumption/?period_from=${midnight.toISOString()}`,
      {
        headers: {
          Authorization: `Basic ${btoa(this.accountDetails.apiKey + ':')}`
        }
      }
    );

    if (res.ok) {
      this.todaysConsumption_e = ((await res.json()).results as Consumption[]);
    } else {
      // Sometimes the API will fail!
      throw new Error("Request failed");
    }
  }
}
