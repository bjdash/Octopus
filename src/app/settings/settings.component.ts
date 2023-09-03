import { Component } from '@angular/core';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { AccountDetails } from '../models';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  form: FormGroup;
  savedValues: AccountDetails = {
    mpan: '',
    electricitySerialNo: '',
    mprn: '',
    gasSerialNo: '',
    apiKey: ''
  }
  constructor(private formBuilder: FormBuilder) {
    this.form = this.formBuilder.group({
      mpan: ['', Validators.required],
      electricitySerialNo: ['', Validators.required],
      mprn: ['', Validators.required],
      gasSerialNo: ['', Validators.required],
      apiKey: ['', Validators.required]
    })

    Object.keys(this.savedValues).forEach(key => {
      this.savedValues[key as keyof AccountDetails] = localStorage.getItem(key) as string;
    });
    this.form.patchValue(this.savedValues);
  }

  onSubmit() {
    this.savedValues = this.form.value;
    Object.keys(this.form.value).forEach(key => {
      localStorage.setItem(key, this.savedValues[key as keyof AccountDetails])
    })
  }
}
