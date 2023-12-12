const logger = {
  debug: false,

  log: (message?: any, ...optionalParams: any[]) => {
    logger.debug && console.log(`${(new Date()).toISOString()}: Monokle:`, message, ...optionalParams);
  },

  warn: (message?: any, ...optionalParams: any[]) => {
    logger.debug && console.warn(`${(new Date()).toISOString()}: Monokle:`, message, ...optionalParams);
  },

  error: (message?: any, ...optionalParams: any[]) => {
    logger.debug && console.error(`${(new Date()).toISOString()}: Monokle:`, message, ...optionalParams);
  },
};

export default logger;