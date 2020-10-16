import { DeploymentModel, ServiceModel, LevisConfig } from "../models";
import * as Constants from "../models/constants";
import * as log4js from "log4js";
import { EnvVar, RollingUpdateDeployment } from "../../libs/k8s";
import { TypeMapper } from ".";

const log = log4js.getLogger();

export class ConfigParser {
    
    private static isRollingUpdateEnable(type: string): boolean {
        return type == Constants.Deployment.STRATEGY_ROLLING_UPDATE;
    }
  
    private static createStrategyRollingUpdate(isCreate: boolean, maxSurge: string, maxUnavailable: string): RollingUpdateDeployment {
        if(!isCreate) return {};
        return {
            maxSurge: maxSurge,
            maxUnavailable: maxUnavailable
        }
    }
      
    public static ParseService (config: LevisConfig): ServiceModel {
        const serviceName = config.levis.service?.name || config.levis.name;
        return {
            name: serviceName,
            namespace: config.levis.namespace || Constants.MetaData.DEFAULT_NAMESPACE,
            labels: config.levis.service?.labels || {app: serviceName},
            annotations: config.levis.service?.annotations,
            selector: config.levis.service?.selector || config.levis.deployment.matchLabels,
            type: config.levis.service?.type || Constants.Service.TYPE_CLUSTER_IP,
            portName: config.levis.service?.ports?.name || serviceName,
            port: config.levis.service?.ports?.port || config.levis.deployment.containers.port,
            targetPort: config.levis.service?.ports?.targetPort || config.levis.deployment.containers.port,
            nodePort: config.levis.service?.ports?.nodePort,
        };
    }

    public static ParseDeployment (config: LevisConfig): DeploymentModel {
        
        const deploymentName = config.levis.deployment.name || config.levis.name;
        const deploymentLabels = config.levis.deployment.labels || {app: deploymentName};
        const env = config.levis.deployment.containers.env;
        const containerEnv: EnvVar[] = env ? TypeMapper.toEnvVar(env): []; 
        const rollingUpdateType: string = config.levis.deployment.strategy?.type || Constants.Deployment.STRATEGY_ROLLING_UPDATE;
        const maxSurge: string = config.levis.deployment.strategy?.rollingUpdate?.maxSurge || Constants.Deployment.ROLLING_UPDATE_MAX_SURGE;
        const maxUnavailable: string = config.levis.deployment.strategy?.rollingUpdate?.maxUnavailable || Constants.Deployment.ROLLING_UPDATE_MAX_UNAVAILABLE;
        const rollingUpdateStrategy = this.createStrategyRollingUpdate(
            this.isRollingUpdateEnable(rollingUpdateType),
            maxSurge,
            maxUnavailable
            );     
        log.debug("rollingUpdate: ", rollingUpdateStrategy);
        log.debug("envVar: ", containerEnv);
        return {
            name: deploymentName,
            namespace: config.levis.namespace || Constants.MetaData.DEFAULT_NAMESPACE ,
            labels: deploymentLabels,
            annotations: config.levis.deployment.annotations ,
            serviceAccount:config.levis.deployment.serviceAccount || Constants.Pod.DEFAULT_SERVICE_ACCOUNT ,
            revisionHistoryLimit:config.levis.deployment.revisionHistoryLimit || Constants.Deployment.REVISION_HISTORY_LIMIT,
            replicas:config.levis.deployment.replicas || Constants.Deployment.REPLICAS,
            strategy:{
                type: rollingUpdateType,
                rollingUpdate: rollingUpdateStrategy
            }, 

            matchLabels: config.levis.deployment.matchLabels || deploymentLabels,
            containerName: config.levis.deployment.containers?.name || deploymentName,
            containerImage: config.levis.deployment.containers?.image,
            containerImagePullPolicy: config.levis.deployment.containers?.imagePullPolicy || Constants.Container.IMAGE_PULL_POLICY,
            containerPort: config.levis.deployment.containers?.port,
            containerEnvironment: containerEnv,
            resources: config.levis.deployment.containers.resources,
            probe: {
                readinessProbe: {
                    path: config.levis.deployment.containers.readinessProbe?.path || Constants.Container.READINESS_PATH,
                    port: config.levis.deployment.containers.readinessProbe?.port || config.levis.deployment.containers.port,
                    initialDelaySeconds: config.levis.deployment.containers.readinessProbe?.initialDelaySeconds || Constants.Container.READINESS_INITIAL_DELAY_SECONDS,
                    intervalSeconds: config.levis.deployment.containers.readinessProbe?.intervalSeconds || Constants.Container.READINESS_PERIOD_SECONDS,
                    successThreshold: config.levis.deployment.containers.readinessProbe?.successThreshold || Constants.Container.READINESS_SUCCESS_THRESHOLD,
                    failureThreshold: config.levis.deployment.containers.readinessProbe?.failureThreshold || Constants.Container.READINESS_FAILURE_THRESHOLD,
                    timeoutSeconds: config.levis.deployment.containers.readinessProbe?.timeoutSeconds || Constants.Container.READINESS_TIMEOUT_SECONDS,
                },
                livenessProbe: {
                    path: config.levis.deployment.containers.livenessProbe?.path || Constants.Container.LIVENESS_PATH,
                    port: config.levis.deployment.containers.livenessProbe?.port || config.levis.deployment.containers.port,
                    initialDelaySeconds: config.levis.deployment.containers.livenessProbe?.initialDelaySeconds || Constants.Container.LIVENESS_INITIAL_DELAY_SECONDS,
                    intervalSeconds: config.levis.deployment.containers.livenessProbe?.intervalSeconds || Constants.Container.LIVENESS_PERIOD_SECONDS,
                    successThreshold: config.levis.deployment.containers.livenessProbe?.successThreshold || Constants.Container.LIVENESS_SUCCESS_THRESHOLD,
                    failureThreshold: config.levis.deployment.containers.livenessProbe?.failureThreshold || Constants.Container.LIVENESS_FAILURE_THRESHOLD,
                    timeoutSeconds: config.levis.deployment.containers.livenessProbe?.timeoutSeconds || Constants.Container.LIVENESS_TIMEOUT_SECONDS,
                }
            },
        };
    }
}