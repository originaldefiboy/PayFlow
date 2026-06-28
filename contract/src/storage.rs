use soroban_sdk::{Address, Env};

use crate::{DataKey, Subscription};

pub fn set_subscription(env: &Env, user: &Address, sub: &Subscription) {
    env.storage()
        .persistent()
        .set(&DataKey::Subscription(user.clone()), sub);
}

pub fn get_subscription(env: &Env, user: &Address) -> Option<Subscription> {
    env.storage()
        .persistent()
        .get(&DataKey::Subscription(user.clone()))
}

pub fn set_token(env: &Env, token: &Address) {
    env.storage().instance().set(&DataKey::Token, token);
}

pub fn get_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .expect("admin not set")
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn set_pause_expiry(env: &Env, user: &Address, expiry: u64) {
    env.storage()
        .persistent()
        .set(&DataKey::PauseExpiry(user.clone()), &expiry);
}

pub fn get_pause_expiry(env: &Env, user: &Address) -> Option<u64> {
    env.storage()
        .persistent()
        .get(&DataKey::PauseExpiry(user.clone()))
}

pub fn clear_pause_expiry(env: &Env, user: &Address) {
    env.storage()
        .persistent()
        .remove(&DataKey::PauseExpiry(user.clone()));
}
