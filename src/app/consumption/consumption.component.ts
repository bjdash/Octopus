import { Component } from '@angular/core';
import { AccountDetails, Consumption, DailyConsumption, Tariff } from '../models';
import { Router } from '@angular/router';
import { KeyValue } from '@angular/common';

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
  activeTab: 'gas' | 'electricity️' = 'electricity️';
  pastDays = 0;
  tariffMap: { [key: string]: number } = {}

  todaysConsumption_e: Consumption[] = [];
  dailyConsumptions: DailyConsumption[] = []

  constructor(private router: Router) {
    Object.keys(this.accountDetails).forEach(key => {
      this.accountDetails[key as keyof AccountDetails] = localStorage.getItem(key) as string;
    });
    if (Object.values(this.accountDetails).some(v => !v)) {
      this.router.navigate(['settings'])

    } else {
      this.getElectricConsumptionToday(this.pastDays);
    }

  }

  async getElectricConsumptionToday(pastDays: number) {
    let fetchFrom = new Date(), fetchTill = new Date();
    fetchFrom.setHours(0, 1, 0, 0);
    fetchFrom.setDate(fetchFrom.getDate() - pastDays);
    if (pastDays !== 0) {
      fetchTill.setHours(0, 0, 0, 0);
      fetchTill.setDate(fetchTill.getDate() - pastDays + 1)
    }

    // if (fetchFrom.getTimezoneOffset() != 0) {
    //   fetchFrom.setHours(fetchFrom.getHours() - (fetchFrom.getTimezoneOffset() / 60))
    //   fetchTill.setHours(fetchTill.getHours() - (fetchTill.getTimezoneOffset() / 60))
    // }

    console.log(fetchFrom.toLocaleString(), fetchTill.toLocaleString(), pastDays)
    const consumptionResponse = await fetch(
      `https://api.octopus.energy/v1/electricity-meter-points/${this.accountDetails.mpan}/meters/${this.accountDetails.electricitySerialNo}/consumption/?period_from=${fetchFrom.toISOString()}&period_to=${fetchTill.toISOString()}`,
      {
        headers: {
          Authorization: `Basic ${btoa(this.accountDetails.apiKey + ':')}`
        }
      }
    );

    if (consumptionResponse.ok) {
      let tariffMap: { [key: string]: number } = {};
      // this.dailyConsumptions[fetchFrom.toLocaleDateString()] = {}


      const tariffResp = await fetch(
        `https://api.octopus.energy/v1/products/AGILE-FLEX-22-11-25/electricity-tariffs/E-1R-AGILE-FLEX-22-11-25-N/standard-unit-rates/?period_from=${fetchFrom.toISOString()}&period_to=${fetchTill.toISOString()}`
      );
      if (tariffResp.ok) {
        ((await tariffResp.json()).results as Tariff[]).forEach(t => {
          this.tariffMap[t.valid_from] = parseFloat(t.value_inc_vat.toFixed(2))
          tariffMap[t.valid_from] = parseFloat(t.value_inc_vat.toFixed(2));
        })
      }

      let consumptionResponseJson = await consumptionResponse.json();
      this.todaysConsumption_e = (consumptionResponseJson.results as Consumption[]).map(c => {
        c.unitRate = this.tariffMap[new Date(c.interval_start).toISOString().replace(/\.\d+/, "")] || 0;
        return c;
      });

      let dayData: DailyConsumption = {
        totalKW: '0',
        totalPrice: '0',
        date: fetchFrom.toISOString(),
        consumptions: (consumptionResponseJson.results as Consumption[]).map(c => {
          c.unitRate = this.tariffMap[new Date(c.interval_start).toISOString().replace(/\.\d+/, "")] || 0;
          return c;
        })
      };
      dayData.totalKW = dayData.consumptions.reduce((partialSum, c) => partialSum + c.consumption, 0).toFixed(2);
      dayData.totalPrice = dayData.consumptions.reduce((partialSum, c) => partialSum + (c.consumption * c.unitRate!), 0).toFixed(2);
      this.dailyConsumptions.push(dayData);


      console.log(this.dailyConsumptions);



    } else {
      // Sometimes the API will fail!
      throw new Error("Request failed");
    }
  }

  keyDescOrder = (a: KeyValue<string, string>, b: KeyValue<string, string>): number => {
    return new Date(a.key) > new Date(b.key) ? -1 : (b.key > a.key ? 1 : 0);
  }
}
