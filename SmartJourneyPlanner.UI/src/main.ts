import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app'; // ✅ Point to the new file name
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
