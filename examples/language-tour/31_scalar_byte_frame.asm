; ZAX lowered .asm trace
; range: $0100..$2001 (end exclusive)

; func touch_scalar_byte_frame begin
touch_scalar_byte_frame:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld B, (IX+$04)                 ; 010B: DD 46 04
push DE                        ; 010E: D5
push HL                        ; 010F: E5
ld E, (IX + $0004)             ; 0110: DD 5E 04
ld D, (IX + $0005)             ; 0113: DD 56 05
ld HL, $0000                   ; 0116: 21 00 00
add HL, DE                     ; 0119: 19
ld (HL), B                     ; 011A: 70
pop HL                         ; 011B: E1
pop DE                         ; 011C: D1
ld H, $0000                    ; 011D: 26 00
ld L, B                        ; 011F: 68
__zax_epilogue_0:
pop DE                         ; 0120: D1
pop BC                         ; 0121: C1
pop AF                         ; 0122: F1
ld SP, IX                      ; 0123: DD F9
pop IX                         ; 0125: DD E1
ret                            ; 0127: C9
; func main begin
; func touch_scalar_byte_frame end
main:
push IX                        ; 0128: DD E5
ld IX, $0000                   ; 012A: DD 21 00 00
add IX, SP                     ; 012E: DD 39
push AF                        ; 0130: F5
push BC                        ; 0131: C5
push DE                        ; 0132: D5
push HL                        ; 0133: E5
ld HL, $0044                   ; 0134: 21 44 00
push HL                        ; 0137: E5
call touch_scalar_byte_frame   ; 0138: CD 00 00
inc SP                         ; 013B: 33
inc SP                         ; 013C: 33
__zax_epilogue_1:
pop HL                         ; 013D: E1
pop DE                         ; 013E: D1
pop BC                         ; 013F: C1
pop AF                         ; 0140: F1
ld SP, IX                      ; 0141: DD F9
pop IX                         ; 0143: DD E1
ret                            ; 0145: C9
; func main end

; symbols:
; label touch_scalar_byte_frame = $0100
; label __zax_epilogue_0 = $0120
; label main = $0128
; label __zax_epilogue_1 = $013D
; data dummy = $2000
