use crate::{DataKey, SUBSCRIPTION_TTL_LEDGERS};
use soroban_sdk::Env;

pub fn get_grace_period(env: &Env) -> u64 {
    if let Some(seconds) = env.storage().instance().get(&DataKey::GracePeriod) {
        let lower = SUBSCRIPTION_TTL_LEDGERS / 2;
        let upper = SUBSCRIPTION_TTL_LEDGERS;
        env.storage().instance().extend_ttl(lower, upper);
        seconds
    } else {
        0
    }
}

pub fn set_grace_period(env: &Env, seconds: u64) {
    assert!(seconds <= u64::MAX / 2, "grace period too large");

    env.storage().instance().set(&DataKey::GracePeriod, &seconds);

    let lower = SUBSCRIPTION_TTL_LEDGERS / 2;
    let upper = SUBSCRIPTION_TTL_LEDGERS;
    env.storage().instance().extend_ttl(lower, upper);
}
}
