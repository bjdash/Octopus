import { Component } from '@angular/core';
import { AccountDetails, Consumption } from '../models';
import { Router } from '@angular/router';

@Component({
  selector: 'app-consumption',
  templateUrl: './consumption.component.html',
  styleUrls: ['./consumption.component.scss'],
  host: {
    class: 'bottom-gap'
  }
})
export class ConsumptionComponent {
  accountDetails: AccountDetails = {
    mpan: '',
    electricitySerialNo: '',
    mprn: '',
    gasSerialNo: '',
    apiKey: ''
  }
  activeTab: 'gas' | 'electricity️' = 'electricity️'

  todaysConsumption_e: Consumption[] = []

  constructor(private router: Router) {
    Object.keys(this.accountDetails).forEach(key => {
      this.accountDetails[key as keyof AccountDetails] = localStorage.getItem(key) as string;
    });
    if (Object.values(this.accountDetails).some(v => !v)) {
      this.router.navigate(['settings'])

    } else {
      this.getElectricConsumptionToday();
    }

  }

  async getElectricConsumptionToday() {
    let yesterday = new Date();
    yesterday.setHours(0, 0, 0, 0);
    yesterday.setDate(yesterday.getDate() - 2)


    const res = await fetch(
      `https://api.octopus.energy/v1/electricity-meter-points/${this.accountDetails.mpan}/meters/${this.accountDetails.electricitySerialNo}/consumption/?period_from=${yesterday.toISOString()}`,
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
