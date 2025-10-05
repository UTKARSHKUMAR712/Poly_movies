import axios from "axios";
import { getBaseUrl } from "./getBaseUrl";
import { headers } from "./headers";
import * as cheerio from "cheerio";
import { hubcloudExtracter } from "./hubcloudExtractor";
import { superVideoExtractor } from "./superVideoExtractor";
import { gdFlixExtracter } from "./gdflixExtractor";
import { ProviderContext } from "./types";
import Aes from "react-native-aes-crypto";

/**
 * Context for provider functions.
 * This context is used to pass common dependencies to provider functions.
 */

const extractors = {
  hubcloudExtracter,
  superVideoExtractor,
  gdFlixExtracter,
};

export const providerContext: ProviderContext = {
  axios,
  getBaseUrl,
  commonHeaders: headers,
  Aes,
  cheerio,
  extractors,
};
