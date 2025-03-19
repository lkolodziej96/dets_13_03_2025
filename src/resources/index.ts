import xmlRawData from './DETS.xlsx?raw-hex';

import { fromHexString } from '../utils/encoding';

export const BUILD_IN_XML = fromHexString(xmlRawData);
