import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TariffComponent } from './tariff/tariff.component';
import { ConsumptionComponent } from './consumption/consumption.component';
import { SettingsComponent } from './settings/settings.component';
import { PriceColorPipe } from './priceColor.pipe';

@NgModule({
  declarations: [
    AppComponent,
    TariffComponent,
    ConsumptionComponent,
    SettingsComponent,
    PriceColorPipe
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
