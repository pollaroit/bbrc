import { Field, FieldError, FieldLabel } from "@bbrc/ui/components/field";
import {
	type Control,
	Controller,
	type ControllerFieldState,
	type ControllerRenderProps,
	type FieldValues,
	type Path,
	type UseFormStateReturn,
} from "react-hook-form";

interface FormInputProps<
	TFieldValues extends FieldValues = FieldValues,
	TContext = unknown,
	TTransformedValues = TFieldValues,
	TName extends Path<TFieldValues> = Path<TFieldValues>,
> {
	control: Control<TFieldValues, TContext, TTransformedValues>;
	name: TName;
	render: (
		field: ControllerRenderProps<TFieldValues, TName>,
		fieldState: ControllerFieldState,
		formState: UseFormStateReturn<TFieldValues>,
	) => React.ReactElement;
	label?: string;
	labelClassName?: string;
	errorClassName?: string;
	className?: string;
}

export type FormInputPropsWithoutControl<
	TFieldValues extends FieldValues,
	TContext = unknown,
	TTransformedValues = TFieldValues,
	TName extends Path<TFieldValues> = Path<TFieldValues>,
> = Omit<
	FormInputProps<TFieldValues, TContext, TTransformedValues, TName>,
	"control"
>;

export function FormInput<
	TFieldValues extends FieldValues,
	TContext = unknown,
	TTransformedValues = TFieldValues,
	TName extends Path<TFieldValues> = Path<TFieldValues>,
>({
	control,
	name,
	render,
	label,
	labelClassName,
	errorClassName,
	className,
}: FormInputProps<TFieldValues, TContext, TTransformedValues, TName>) {
	return (
		<Controller
			control={control}
			name={name}
			render={({ field, fieldState, formState }) => {
				const errorMessage = fieldState.error?.message;

				return (
					<Field className={className}>
						{label ? (
							<FieldLabel className={labelClassName} htmlFor={field.name}>
								{label}
							</FieldLabel>
						) : null}
						{render(field, fieldState, formState)}
						{errorMessage ? (
							<FieldError className={errorClassName}>{errorMessage}</FieldError>
						) : null}
					</Field>
				);
			}}
		/>
	);
}
