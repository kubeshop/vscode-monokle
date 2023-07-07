const logger = {
  debug: false,

  log: (message?: any, ...optionalParams: any[]) => {
    logger.debug && console.log('Monokle:', message, ...optionalParams);
  },

  error: (message?: any, ...optionalParams: any[]) => {
    logger.debug && console.error('Monokle:', message, ...optionalParams);
  },
};

export default logger;