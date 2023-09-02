import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TariffComponent } from './tariff/tariff.component';
import { ConsumptionComponent } from './consumption/consumption.component';
import { SettingsComponent } from './settings/settings.component';

const routes: Routes = [{
  path: '',
  component: TariffComponent
}, {
  path: 'consumption',
  component: ConsumptionComponent
}, {
  path: 'settings',
  component: SettingsComponent
}]
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
