"use client";

import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	type DefaultValues,
	type FieldValues,
	type Path,
	type Resolver,
	type UseFormProps,
	type UseFormReturn,
	useForm,
} from "react-hook-form";
import type { z } from "zod";
import {
	FormInput,
	type FormInputPropsWithoutControl,
} from "@/components/form-input";

type AppFormInput<
	TFieldValues extends FieldValues,
	TContext,
	TTransformedValues extends FieldValues | undefined,
> = <TName extends Path<TFieldValues>>(
	props: FormInputPropsWithoutControl<
		TFieldValues,
		TContext,
		TTransformedValues,
		TName
	>,
) => React.ReactElement;

type AppFormSubmit = (
	props: Omit<React.ComponentProps<typeof LoadingButton>, "type">,
) => React.ReactElement;

export type AppFormReturn<
	TFieldValues extends FieldValues,
	TContext = unknown,
	TTransformedValues extends FieldValues | undefined = TFieldValues,
> = UseFormReturn<TFieldValues, TContext, TTransformedValues> & {
	Input: AppFormInput<TFieldValues, TContext, TTransformedValues>;
	Submit: AppFormSubmit;
};

export function useAppForm<
	TFieldValues extends FieldValues,
	TContext = unknown,
	TTransformedValues extends FieldValues | undefined = TFieldValues,
>(
	schema: z.ZodType<TFieldValues>,
	defaultValues: DefaultValues<TFieldValues>,
	options?: Omit<
		UseFormProps<TFieldValues, TContext, TTransformedValues>,
		"defaultValues" | "resolver"
	>,
): AppFormReturn<TFieldValues, TContext, TTransformedValues> {
	const form = useForm<TFieldValues, TContext, TTransformedValues>({
		...options,
		defaultValues,
		resolver: zodResolver(schema as never) as Resolver<
			TFieldValues,
			TContext,
			TTransformedValues
		>,
	});

	function Input<TName extends Path<TFieldValues>>(
		props: FormInputPropsWithoutControl<
			TFieldValues,
			TContext,
			TTransformedValues,
			TName
		>,
	) {
		return <FormInput control={form.control} {...props} />;
	}

	function Submit({
		children,
		...props
	}: Omit<React.ComponentProps<typeof LoadingButton>, "type">) {
		return (
			<LoadingButton
				type="submit"
				{...props}
				loading={
					typeof props.loading === "boolean"
						? props.loading
						: form.formState.isSubmitting
				}
			>
				{children}
			</LoadingButton>
		);
	}

	return { ...form, Input, Submit };
}
